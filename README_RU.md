<div align="center">
<img src="branding/logo-2.png" alt="Lecoo Control Center logo">

<h1>Lecoo Control Center</h1>

<p>
Десктоп-приложение для управления ноутбуками Lecoo / Emdoor: живая телеметрия, кривые вентиляторов, профили питания, лимиты заряда, подсветка клавиатуры и заднее LED-кольцо — всё работает через Windows-сервис, который общается со встроенным контроллером (EC).
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg)](https://github.com/A-mi13/Lecoo-Control-Center)
[![Built with Tauri 2](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app/)
[![Language](https://img.shields.io/badge/language-Rust%20%2B%20React-orange.svg)](https://github.com/A-mi13/Lecoo-Control-Center)
[![Status](https://img.shields.io/badge/status-beta-blue.svg)](https://github.com/A-mi13/Lecoo-Control-Center)

</div>

**Языки:** [English](README.md) · [中文](README_CN.md) · [Русский](README_RU.md)

## Про этот форк

Этот репозиторий — форк проекта [LaVashikk/Lecoo-Control-Center](https://github.com/LaVashikk/Lecoo-Control-Center), который методом обратной разработки расшифровал EC ITE IT5570 / IT8987 в ноутбуках семейства Lecoo Pro 14 (N155) и написал Rust-демон + CLI `lecoo-ctrl` поверх него. **Вся заслуга за исследование EC, IPC-протокол, daemon и CLI принадлежит LaVashikk.**

Что добавляет этот форк:

- **Десктопный GUI на Tauri 2 + React** — полноценная панель управления: live-плитки температур и оборотов, uPlot-график с выбором временного диапазона, SVG-редактор кривых вентиляторов с drag-and-drop точками и пресетами, переключение профилей питания и FlexiCharger, подсветка клавиатуры с превью клавиш, конструктор анимаций LED-кольца, кастомный titlebar с индикатором связи, system tray с быстрыми меню профилей/вентиляторов, автозапуск, темы (light/dark/auto), локализация на трёх языках. *(основная причина существования этого форка.)*
- **MSI-инсталлер, регистрирующий daemon как Windows-сервис** — один файл `Lecoo Control Center_*.msi` ставит GUI, daemon и `inpoutx64.dll`, прописывает `LecooControlDaemon` как сервис LocalSystem с автозапуском. После установки GUI открывается как обычная программа — без UAC, без запуска от Администратора руками.
- **Встроенная диагностика для багрепортов** — Settings → Diagnostics → Copy diagnostics собирает версию GUI, инфу о системе, последнюю ошибку daemon'а и хвост лог-файла в markdown-блок, который вставляется прямо в issue. Verbose logging переключается там же.
- **Доработки daemon'а (в плане этого форка)** — server-side вычисление кривой, восстановление состояния после resume-from-sleep, фикс автостарта на Windows 11 25H2 и страховка от lock-contention в EC. Прогресс отражается в [CHANGELOG.md](CHANGELOG.md).

Всё остальное — EC HRAM, PWM, пороги FlexiCharger, LED-анимации, формат IPC — взято из upstream без изменений.

## Статус

GUI находится в **бета**-стадии. Все семь фаз (shell, телеметрия, дашборд, power/battery/keyboard, кривые вентиляторов, LED ring, settings + tray) реализованы и собираются в работающий MSI под Windows. До тэгированной v1.0 остаются daemon-side доработки выше и подписанный release pipeline.

## Скриншоты

<table>
  <tr>
    <td align="center"><img src="branding/screenshots/overview.png" alt="Overview" width="420"><br><sub>Overview · живая телеметрия</sub></td>
    <td align="center"><img src="branding/screenshots/fans.png" alt="Fans" width="420"><br><sub>Fans · редактор кривой</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="branding/screenshots/power.png" alt="Power" width="420"><br><sub>Power · профиль + диагностика</sub></td>
    <td align="center"><img src="branding/screenshots/battery.png" alt="Battery" width="420"><br><sub>Battery · FlexiCharger</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="branding/screenshots/keyboard.png" alt="Keyboard" width="420"><br><sub>Keyboard · подсветка</sub></td>
    <td align="center"><img src="branding/screenshots/led-ring.png" alt="LED Ring" width="420"><br><sub>LED Ring · конструктор анимаций</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="branding/screenshots/settings.png" alt="Settings" width="640"><br><sub>Settings · темы, язык, диагностика</sub></td>
  </tr>
</table>

## Возможности

- ✨ **Живая телеметрия** — температуры CPU и системы, обороты вентиляторов CPU/GPU, опрос раз в секунду через IPC. История до 30 минут питает график с диапазонами 30 с / 60 с / 5 м / 30 м и четыре stat-плитки с inline-sparkline.
- 🌡️ **Кривые вентиляторов** — интерактивный SVG-редактор для CPU и GPU. Точки тащатся мышкой, двойной клик добавляет новую, правый клик удаляет. Текущая температура едет по кривой, видно какой PWM получится. Три стартовых пресета (Silent / Balanced / Aggressive). Сейчас кривые считаются клиент-сайд с тиком 500 мс; server-side вычисление — часть запланированных правок daemon'а.
- ⚡ **Профили питания** — Silent / Default / Performance в один клик из дашборда, страницы Power и system tray.
- 🔋 **Лимиты заряда (FlexiCharger)** — Full / High / Balanced / Maximum Lifespan / Desk Mode, у каждого реальный процентный диапазон и короткое описание.
- ⌨️ **Подсветка клавиатуры** — пресеты Off / Low / Medium / High + кастомный slider 0–255. Превью из 3 рядов клавиш светится в реальном времени до отправки команды.
- 💡 **Заднее LED-кольцо** — Auto (EC сам), Static (slider 0–255 + кольцо-превью), Animation: полный конструктор дыхания (макс. яркость, шаги вверх/вниз, паузы) и одиннадцать именованных пресетов (smooth, sleep, alert, zen, ping, energetic, warning, vacuum, panic, sonar, toxic), у каждого свой thumbnail-профиль.
- 🎨 **Темы** — light, dark, auto (по `prefers-color-scheme`). Палитра через CSS-переменные, поэтому графики и LED-превью всегда совпадают с темой.
- 🌍 **Интернационализация** — English, Русский, 中文 из коробки. Язык и тема выбираются в Settings и сохраняются.
- 📌 **System tray** — клик открывает окно, в меню быстрое переключение профиля и режима вентиляторов, закрытие окна сворачивает в трей (полный выход — Quit в меню трея).
- 🔧 **Встроенная диагностика** — кнопка открытия папки логов, «Copy diagnostics» одной кнопкой, runtime-переключатель verbose logging. См. *Сообщить о баге* ниже.

Низкоуровневые команды CLI (`lecoo-ctrl ...`) — см. [upstream README](https://github.com/LaVashikk/Lecoo-Control-Center). CLI в этом форке сохранён без изменений.

## Установка

Рекомендованный путь — MSI:

1. Возьми последний `Lecoo Control Center_*.msi` со [страницы Releases](https://github.com/A-mi13/Lecoo-Control-Center/releases) (как только выйдет первая тэгированная сборка) **или** собери из исходников (см. ниже).
2. Запусти от Администратора. Инсталлер скопирует GUI и daemon в `C:\Program Files\Lecoo Control Center\` и зарегистрирует daemon как Windows-сервис `LecooControlDaemon` (LocalSystem, автозапуск).
3. После установки открывай **Lecoo Control Center** из Пуска — обычным юзером, без UAC. Сервис уже работает в фоне и держит EC.

Проверить сервис:

```powershell
sc query LecooControlDaemon
# ожидается: STATE : 4 RUNNING
```

Чистое удаление: Параметры Windows → Приложения. Инсталлер сам останавливает и удаляет сервис.

## Сборка из исходников

Понадобится:

- Rust stable (1.80+) через [rustup](https://rustup.rs/).
- Node.js 20+ и pnpm 9+ для фронта.
- [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) для твоей платформы. На Windows это MSVC build tools и WebView2 (предустановлен в Windows 11).

```bash
git clone https://github.com/A-mi13/Lecoo-Control-Center.git
cd Lecoo-Control-Center

# Daemon + CLI (release)
cargo build --release -p lecoo-ec-daemon
cargo build --release -p cli

# MSI-инсталлер GUI
cd gui
pnpm install
pnpm tauri build
```

`pnpm tauri build` собирает один MSI:

```
target/release/bundle/msi/Lecoo Control Center_<version>_x64_en-US.msi
```

В MSI попадают daemon (пересобирается автоматически перед bundle'ом), `inpoutx64.dll` из `libs/` и сам GUI; Windows-сервис прописывается так же как из публичного инсталлера.

Для разработки GUI: `pnpm tauri dev` открывает окно поверх Vite на `localhost:5173`. Rust-бэкенд будет ретраить коннект к daemon'у; если сервис не установлен, в connection-pill будет "Daemon not reachable".

## Сообщить о баге

Если что-то ведёт себя странно, проще всего отправить issue прямо из GUI:

1. Открой **Settings → Diagnostics → Copy diagnostics**. В буфер попадёт markdown-блок с версией GUI, инфой об OS, последней ошибкой daemon'а и хвостом текущего лога.
2. Вставь его в новый issue: <https://github.com/A-mi13/Lecoo-Control-Center/issues>.

Если баг непостоянный — включи **Verbose logging**, воспроизведи проблему, потом снова Copy diagnostics. В бандле будут `debug`-логи. Кнопка "Open log folder" рядом открывает `%LOCALAPPDATA%\Lecoo Control Center\logs\`, где лежат суточные ротированные логи.

Баги, явно относящиеся к daemon / CLI / EC-слою, можно и нужно дублировать в upstream: <https://github.com/LaVashikk/Lecoo-Control-Center/issues> — там их больше людей увидит, а наши фиксы туда тоже летят, когда применимо.

## Архитектура

Cargo workspace. Основные члены:

```
Lecoo-Control-Center/
├── ipc/        # Общие типы и named-pipe IPC-протокол (bincode Encode/Decode)
├── daemon/     # Фоновый сервис: EC-драйвер, IPC-сервер, lifecycle
├── cli/        # `lecoo-ctrl` — командная строка
├── gui/        # Tauri 2: Rust back-end + React/TS front-end
└── libs/       # Нативные зависимости (inpoutx64.dll)
```

GUI говорит с daemon'ом через тот же named pipe (`lecoo_ctl_daemon`), что и CLI, так что они уживаются рядом. Rust-часть GUI держит 1 Hz поллер, эмитит события `telemetry` и `connection-status` во вью; действия пользователя (set fan mode, apply curve, change profile, …) идут обратно через Tauri-команды в тот же IPC.

## Лицензия

[MIT License](LICENSE), как и в upstream.

## Авторы

- **LaVashikk** — автор оригинального [Lecoo-Control-Center](https://github.com/LaVashikk/Lecoo-Control-Center). Сделал обратную разработку HRAM-разметки ITE IT5570 / IT8987, спроектировал IPC-протокол, написал Rust-демон и `lecoo-ctrl` CLI. Этот форк без той работы не существовал бы, и любые правки в EC / daemon / CLI здесь идут с прицелом на upstream.
- **[@A-mi13](https://github.com/A-mi13)** — мейнтейнер форка; отвечает за Tauri 2 + React GUI, MSI-инсталлер и daemon-side правки из *Про этот форк*.
- Сообщество ноутбуков Lecoo / Emdoor — за дампы EC offset'ов и репорты по разным ревизиям материнок в upstream.

## Дисклеймер

Это ПО напрямую управляет EC ноутбука. Неправильная настройка — например, прибить вентилятор к 0 % под нагрузкой — может привести к перегреву и необратимому повреждению железа. **Используя это ПО, ты принимаешь этот риск.** Мейнтейнер форка и автор upstream'а не несут ответственности за ущерб устройству.
