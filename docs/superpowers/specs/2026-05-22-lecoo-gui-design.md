# Lecoo Control Center — GUI Design Spec

**Date:** 2026-05-22
**Author:** Brainstorm session
**Repository:** https://github.com/A-mi13/leeco-control-center (fork of https://github.com/LaVashikk/Lecoo-Control-Center)

---

## Цель

Полноценное desktop GUI-приложение поверх существующего daemon'а Lecoo Control Center.
Управление вентиляторами, питанием, батареей, подсветкой клавиатуры и LED-кольцом — с живой
телеметрией, кастомной кривой вентилятора и качественным визуалом.

Заполняем пустой crate `gui/` в форке (у автора `main.rs` это `fn main() {}` — место зарезервировано,
кода нет). Работаем в рамках workspace оригинала, переиспользуем `ipc`-крейт напрямую.

**Принцип:** всё, что показано в UI, реально функционально. Никаких заглушек. Любой переключатель,
ползунок или график соединён с daemon через IPC.

---

## Стек

- **Tauri 2.x** — оболочка приложения (нативный размер ~10 МБ, system tray, autostart, окно).
- **Rust** (backend часть Tauri) — переиспользует `ipc`-крейт оригинала, держит соединение
  с daemon, периодический опрос, событийная шина к фронту.
- **React + TypeScript** — фронт. Никакого тяжёлого UI-кита: Tailwind для атомарной стилизации,
  Radix UI или Headless UI только для сложных примитивов (Select, Dialog, Tooltip).
- **uPlot** для графиков — быстрее и сильно легче Recharts, важно для частых обновлений (раз в секунду на нескольких графиках).
- **i18next** для локализации.
- **Zustand** для лёгкого state-менеджмента (один store на UI-состояние).

---

## Архитектура

```
leeco-control-center/  (форк)
├── ipc/          ← существующий, используем как dep ../ipc
├── daemon/       ← существующий, дорабатываем для нюансов (см. ниже)
├── cli/          ← существующий, не трогаем
├── gui/          ← наша новая работа
│   ├── Cargo.toml
│   ├── src/      ← Rust часть Tauri (минимум кода)
│   │   ├── main.rs
│   │   ├── ipc_client.rs    ← тонкая обёртка над ipc::client
│   │   ├── poller.rs        ← фоновый опросчик телеметрии
│   │   ├── curve.rs         ← интерполяция fan curve (если делаем client-side fallback)
│   │   ├── settings.rs      ← персистентные настройки GUI
│   │   ├── tray.rs          ← system tray
│   │   ├── autostart.rs     ← регистрация в автозапуске
│   │   └── tauri_cmds.rs    ← #[tauri::command] функции для фронта
│   ├── tauri.conf.json
│   ├── package.json
│   └── src-ui/   ← React/TS код
│       ├── App.tsx
│       ├── pages/           ← Overview, Fans, Power, Battery, Keyboard, LedRing, Settings
│       ├── components/      ← Sidebar, Charts, Toggle, Segment, Sliders, FanCurveEditor
│       ├── lib/             ← tauri-api wrappers, types
│       ├── stores/          ← Zustand stores
│       ├── i18n/            ← локализация
│       │   ├── en.json
│       │   ├── ru.json
│       │   └── zh.json
│       └── styles/
└── ...
```

### Поток данных

```
┌───────────────┐  named pipe   ┌──────────────┐  Tauri IPC  ┌───────────────┐
│ daemon (Rust) │ ◄────────────►│ gui (Rust)   │ ◄──────────►│ webview (UI)  │
│ — ECDevice     │ bincode pkts │ — IpcClient  │ JSON cmds   │ — React/TS   │
│ — Mutex<EC>    │  + handshake │ — Poller     │ — events    │ — charts      │
└───────────────┘                └──────────────┘              └───────────────┘
```

- **Daemon ↔ GUI-backend:** существующий `ipc`-крейт. Handshake `"LCC" + major + minor`,
  bincode-пакеты с заголовком (длина + версия).
- **GUI-backend ↔ webview:** Tauri-команды (запросы фронта → бэка) и Tauri-события
  (телеметрия от бэка → фронту, без поллинга на фронте).

### Подсистемы

| Crate / Модуль | Ответственность | Как тестируется |
|---|---|---|
| `gui::ipc_client` | Тонкая обёртка над `ipc::IpcClient`. Reconnect, таймауты, перевод ошибок в типизированные. | Unit (мок pipe), integration с реальным daemon. |
| `gui::poller` | Фоновая задача: опрашивает daemon с настраиваемым интервалом, кеширует последние значения, эмитит Tauri-событие при изменении. | Unit (мок IpcClient), наблюдаемость через метрики. |
| `gui::curve` | Линейная интерполяция fan curve. Fallback-режим: если daemon старый и не поддерживает `SetFanCurve`, GUI сам считает PWM из текущей температуры и шлёт `SetFanMode(Custom(value))` каждые 500мс. | Чистая функция — unit тесты на точках. |
| `gui::settings` | Сериализация UI-настроек в `%APPDATA%/lecoo-gui/config.json`. | Unit. |
| `gui::tray` | System tray иконка + контекстное меню (быстрые действия — профиль, fan mode). | Manual, скриншоты. |
| `gui::autostart` | Регистрация/снятие из автозапуска Windows (HKCU Run). | Manual. |
| `gui::tauri_cmds` | Точки входа из фронта: get_state, set_power_profile, set_fan_mode, set_fan_curve, ... | Integration через `tauri::test`. |
| `src-ui` (React) | Вся визуальная часть, разбита на pages + components. Store держит cache телеметрии + UI-стейт. | Storybook для компонентов, E2E для критичных потоков (применение профиля, редактирование кривой). |

---

## Экраны

### 1. Overview (дашборд)

- Профиль питания (Silent/Default/Perf) сегмент-переключатель в шапке.
- 4 stat-тайла: CPU temp, System temp, CPU Fan RPM, GPU Fan RPM. Спарклайн под каждой
  цифрой (60s).
- Большой график температур (CPU + System) с заливкой-градиентом и переключателем
  диапазона: 30s / 60s / 5m / 30m. История хранится локально в памяти gui-backend,
  с глубиной из настроек (5m / 30m / 2h).
- Карточка вентиляторов: текущий режим + прогресс-бар + RPM.
- Карточка батареи: визуал, %, текущий FlexiCharger режим.
- Переключатель темы (иконка) в правом верхнем углу.

### 2. Fans

- Вкладки CPU Fan / GPU Fan.
- Селектор режима: Auto / Full / Custom.
- В режиме Custom — редактор кривой:
  - Оси: 0–100°C (X), 0–100% PWM (Y).
  - Точки кривой перетаскиваются мышью.
  - Click по линии → добавить точку.
  - Right-click по точке → удалить.
  - Минимум 2 точки (старт + финиш). Точки автоматически сортируются по X.
  - Оранжевая пунктирная линия — текущая температура, движется в реальном времени.
  - Маркер на кривой показывает текущую рабочую точку.
  - Danger-zone подсветка (правая часть выше 80°C).
- Пресеты: Silent / Balanced / Aggressive / Custom (Custom = последнее сохранённое
  пользователем).
- Кнопки: Reset, Add point, Save preset.
- Live-блок снизу: cpu temp / target PWM / actual RPM / daemon latency.

### 3. Power

- Сегмент-переключатель Silent / Default / Perf, занимающий главное место.
- Под ним — описание текущего режима словами (что он делает).
- Read-only диагностика: EC value (0x01/0x02/0x03), время применения.

### 4. Battery

- Список из 5 режимов FlexiCharger карточками: Full / High / Balanced / Lifespan / Desk.
- Каждая карточка: название, %-диапазон, краткое описание.
- Активный режим подсвечен. По клику применяется сразу.

### 5. Keyboard

- 4 базовых уровня сегмент-переключателем (Off / Low / Medium / High).
- Плавный ползунок Custom (0–255) — задаёт `KeyboardBacklightLevel::Custom(u8)`.
- Под ними — мини-визуализация клавиатуры, светящаяся с реальной заданной яркостью.

### 6. LED Ring

- 3 режима: Auto / Custom (статичная яркость) / Animation.
- Ползунок яркости для Custom (0–255).
- Галерея из 11 анимаций (smooth, sleep, alert, zen, ping, energetic, warning, vacuum,
  panic, sonar, toxic). Каждая ячейка — превью с CSS-анимацией, визуально близкой к
  имени пресета. По клику — применяется.
- Под галереей — три ползунка для тонкой настройки выбранной анимации: brightness, step speed,
  delay (передаются как `Animation(BreathConfig { brightness, step_speed, delay })`).
  Изменения применяются мгновенно при отпускании ползунка.

### 7. Settings

- **Appearance:** Theme (Light / Dark / Auto), Language (English / Русский / 中文),
  Temperature unit (°C / °F).
- **Behavior:** Launch at startup, Start minimized to tray, Close to tray, Show tray icon.
- **Telemetry:** Polling interval (1s / 2s / 5s), History window (5m / 30m / 2h).
- **Updates:** Check for updates automatically.
- **Daemon (read-only):** Service status, Daemon version vs GUI version (с pill `match`/`mismatch`),
  IPC endpoint (`\\.\pipe\lecoo_ctl_daemon`).
- **About:** Version, лицензия, ссылка на GitHub.

Изменения применяются мгновенно, без кнопки "Save".

---

## Визуальный язык

- **Стиль:** Pro / Tinkerer, доведённый до уровня Linear / Raycast по полировке.
- **Шрифты:** Inter для текста, JetBrains Mono для чисел и technical labels.
- **Тёмная тема (default):** GitHub Dark — `#0d1117` фон, `#161b22` приподнятые поверхности,
  `#21262d` границы, `#c9d1d9` текст, `#f0f6fc` сильный текст, `#6e7681` приглушённый.
  Акценты: `#58a6ff` (primary), `#56d364` (ok), `#f0883e` (warn), `#a371f7` (вторичный).
- **Светлая тема:** GitHub Light — `#fafbfc` фон, `#ffffff` поверхности, `#d8dee4` границы,
  `#24292f` текст. Акценты адаптированы для контраста: `#0969da`, `#1a7f37`, `#bf6500`, `#8250df`.
- **Цветовые токены:** хранятся в CSS-переменных. Смена темы — переключение класса на `<body>`.
- **Тонкие линии, мягкие тени, акцентные градиенты только в функциональных местах**
  (активный sidebar-item, активный пресет, fill под графиком).
- Графики используют `linearGradient` под линией для глубины, без эффектов размытия.

---

## Поведение

- **Запуск:** проверка соединения с daemon. Если daemon недоступен — показать диагностический
  оверлей с подсказкой (служба не запущена / mismatch версий / pipe занят).
- **Reconnect:** GUI пытается переподключиться каждые 2–5 секунд, если daemon упал.
  Кольцо в шапке мигает красным.
- **System tray:** иконка с быстрым меню — текущий профиль (с галочками), быстрая смена fan
  mode (Auto/Full), кнопка "Open window", "Quit".
- **Закрытие окна:** по умолчанию минимизирует в трей. "Quit" выходит насовсем.
- **Автозапуск:** при включении — регистрация в `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- **Локализация:** автодетект по `GetUserDefaultLocaleName`, fallback на English. Все строки
  через `i18next`.
- **Темы:** Auto = слушаем `prefers-color-scheme` через webview, плюс Tauri-API для системной темы.

---

## Доработки оригинала (наш форк)

Пять изменений к существующему коду:

1. **Server-side fan curve.** Новые IPC-команды `SetFanCurve(curve)` и `GetFanCurve()`.
   Кривая = список `(temp, pwm)` точек + интерполяция. Daemon сам опрашивает температуру
   и применяет PWM. GUI остаётся редактором — но при закрытом GUI кривая продолжает работать.
2. **Push-уведомления телеметрии.** Опциональный broadcast канал в IPC. Daemon шлёт обновления
   при изменении (или с фиксированным интервалом), GUI слушает. Снижает lock contention.
   Если это окажется тяжело — оставляем pull-only.
3. **Resume-from-sleep handler.** Подписаться на Windows power events
   (`SERVICE_CONTROL_POWEREVENT`/`PBT_APMRESUMEAUTOMATIC`). После resume — переприменить
   последние сохранённые настройки. Чинит Issue #5.
4. **Windows 11 25H2 service start.** Диагностика Issue #4, скорее всего проблема с
   таймингами `StartServiceCtrlDispatcher` или новыми требованиями к манифесту сервиса.
5. **Lock contention guard.** Таймаут на mutex в `handlers.rs` (вместо паники), rate limiter
   на клиенте (`gui::ipc_client`), чтобы случайный busy loop не клал daemon.

Все эти изменения выносим в отдельные PR в наш форк. По возможности оформляем upstream PR
автору оригинала.

---

## Что НЕ делаем (явно out of scope)

- Кроссплатформенность на Linux/macOS. Tauri даёт это «почти бесплатно», но не тестируем
  и не релизим. Линуксовый daemon сейчас сломан (Issue #1) — пускай чинит автор.
- Свои анимации LED. Используем только 11 встроенных пресетов `BreathConfig` плюс ручную
  настройку их параметров.
- Своя телеметрия / аналитика. Полагаемся на встроенную в daemon (с возможностью отключить).
- Заплатки за безопасность daemon'а (он от админа, у нас обычный пользователь).
- Графики истории дольше 2 часов — для долгосрочного мониторинга это не приложение.

---

## Риски

- **Tauri webview размер на Windows.** Используем системный WebView2 (предустановлен на
  актуальных Windows). Не bundle'им свой Chromium.
- **Лок-контеншн с daemon при push-уведомлениях.** Если не получится сделать чисто —
  откатываемся на pull, никакой потери в UX.
- **Server-side fan curve меняет протокол.** Версия в handshake (`"LCC" + major + minor`)
  позволит откатиться на client-side curve, если daemon старый.

---

## Acceptance criteria

GUI считается готовым, когда:

- [ ] Все 7 экранов отрисованы и функциональны (никаких placeholder-блоков).
- [ ] Телеметрия (temps, RPM) обновляется в реальном времени с настраиваемой частотой.
- [ ] Custom fan curve редактируется мышью и применяется в реальном времени.
- [ ] При обновлённом daemon (с `SetFanCurve`) кривая продолжает работать при закрытом GUI;
  при старом daemon — fallback на client-side интерполяцию работает, пока окно открыто.
- [ ] Все три языка (En/Ru/Zh) переключаются мгновенно без перезапуска.
- [ ] Светлая и тёмная темы переключаются мгновенно, Auto следит за системой.
- [ ] Tray-иконка с контекстным меню работает; закрытие окна не убивает приложение
  при включённой опции.
- [ ] Автозапуск регистрируется/снимается корректно через настройки.
- [ ] Mismatch версий daemon vs GUI показан в Settings → Daemon.
- [ ] Установщик: один MSI/NSIS, ставит daemon (если ещё не установлен) + GUI.
- [ ] Поведение при потере daemon: понятная ошибка + автоматический reconnect.
