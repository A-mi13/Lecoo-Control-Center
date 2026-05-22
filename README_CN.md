<div align="center">
<img src="branding/logo-2.png" alt="Lecoo Control Center logo">

<h1>Lecoo 控制中心</h1>

<p>
面向 Lecoo / Emdoor 笔记本的桌面控制中心:实时遥测、风扇曲线、电源配置、电池充电限制、键盘背光与机身后部 LED 环 —— 全部通过一个与笔记本嵌入式控制器(EC)通信的 Windows 服务驱动。
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg)](https://github.com/A-mi13/Lecoo-Control-Center)
[![Built with Tauri 2](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app/)
[![Language](https://img.shields.io/badge/language-Rust%20%2B%20React-orange.svg)](https://github.com/A-mi13/Lecoo-Control-Center)
[![Status](https://img.shields.io/badge/status-beta-blue.svg)](https://github.com/A-mi13/Lecoo-Control-Center)

</div>

**语言:** [English](README.md) · [中文](README_CN.md) · [Русский](README_RU.md)

## 关于此分叉

本仓库 fork 自 [LaVashikk/Lecoo-Control-Center](https://github.com/LaVashikk/Lecoo-Control-Center) —— 原项目逆向了 Lecoo Pro 14(N155)系列笔记本上的 ITE IT5570 / IT8987 EC,并在其之上构建了一个 Rust 守护进程和 `lecoo-ctrl` CLI。**所有 EC 研究、IPC 协议、守护进程和 CLI 的功劳归 LaVashikk。**

本分叉的新增/改动:

- **Tauri 2 + React 桌面 GUI** —— 完整的控制界面:实时温度/转速磁贴、带时间窗的 uPlot 温度图、可拖拽的 SVG 风扇曲线编辑器(含预设)、电源配置与 FlexiCharger 切换、键盘背光实时预览、LED 环呼吸动画构建器、自定义标题栏(带连接状态)、托盘菜单(快速切换配置/风扇)、自启动、深浅自动主题,以及英语 / 俄语 / 中文本地化。*(此分叉存在的主要原因。)*
- **将守护进程注册为 Windows 服务的 MSI 安装包** —— 单个 `Lecoo Control Center_*.msi` 会安装 GUI、守护进程和 `inpoutx64.dll`,并将 `LecooControlDaemon` 注册为 LocalSystem 自启动服务。安装后 GUI 像普通程序一样打开 —— 无 UAC 提示,无需手动以管理员身份运行。
- **应用内诊断,便于报告 Bug** —— Settings → Diagnostics → Copy diagnostics 会把 GUI 版本、操作系统信息、最近的守护进程错误和当前日志尾部打包为 markdown,直接粘贴到 GitHub issue 即可。Verbose logging 也在同一界面开关。
- **守护进程改进(此分叉规划中)** —— 服务端风扇曲线评估、休眠唤醒后的状态恢复、Windows 11 25H2 自启动修复、EC I/O 锁竞争保护。进度记录在 [CHANGELOG.md](CHANGELOG.md)。

其余部分 —— EC HRAM 探测、PWM 控制、FlexiCharger 阈值、LED 环动画、IPC 线协议 —— 全部沿用上游。

## 状态

GUI 处于 **Beta** 阶段。全部七个功能阶段(shell、遥测、仪表盘、power/battery/keyboard、风扇曲线、LED 环、设置 + 托盘)已实现,可以构建出可用的 MSI。距离 v1.0 标签发布,还差守护进程侧的改进和带签名的发布流程。

## 截图

首个标签发布后会在这里补上截图。

## 功能

- ✨ **实时遥测** —— CPU 与系统温度,CPU/GPU 风扇 RPM,通过 IPC 每秒刷新。最长 30 分钟的历史驱动温度图(30 秒 / 60 秒 / 5 分 / 30 分时间窗)与四个带 sparkline 的统计磁贴。
- 🌡️ **风扇曲线** —— CPU 与 GPU 的交互式 SVG 编辑器,拖拽点移动,双击新增,右键删除。当前温度沿曲线移动,可直观看到对应占空比。三个起步预设(Silent / Balanced / Aggressive)。当前由 500 ms 客户端 runner 评估;服务端评估为守护进程侧规划。
- ⚡ **电源配置** —— 仪表盘、Power 页面与系统托盘均可一键切换 Silent / Default / Performance。
- 🔋 **电池充电限制(FlexiCharger)** —— Full / High / Balanced / Maximum Lifespan / Desk Mode,每项标注真实百分比范围与简短说明。
- ⌨️ **键盘背光** —— Off / Low / Medium / High 预设以及 0–255 的自定义滑块。三排键盘预览实时跟随,所见即所得。
- 💡 **后部 LED 环** —— Auto(交给 EC)、Static(0–255 滑块 + 发光环预览)或 Animation:完整呼吸构造器(最大亮度、上升/下降步长、最大/最小处停留)与十一个命名预设(smooth、sleep、alert、zen、ping、energetic、warning、vacuum、panic、sonar、toxic),每个预设带缩略呼吸曲线。
- 🎨 **主题** —— 浅色、深色、自动(跟随 `prefers-color-scheme`)。色彩通过 CSS 变量,图表、sparkline 与 LED 预览始终与主题一致。
- 🌍 **本地化** —— 内置 English、Русский、中文。在 Settings 中切换并持久化。
- 📌 **系统托盘** —— 左键打开窗口;菜单含 Power 配置子菜单与风扇模式子菜单;关闭窗口最小化到托盘,Quit 才是真正退出。
- 🔧 **应用内诊断** —— 打开日志目录按钮、一键 Copy diagnostics、runtime Verbose logging 开关。详见下文 *报告 Bug*。

底层 CLI(`lecoo-ctrl ...`)命令 —— 见 [上游 README](https://github.com/LaVashikk/Lecoo-Control-Center)。CLI 在此分叉保留未改。

## 安装

推荐路径是 MSI:

1. 从 [Releases 页面](https://github.com/A-mi13/Lecoo-Control-Center/releases) 拿到最新的 `Lecoo Control Center_*.msi`(首个标签发布后),**或** 按下文从源码自行构建。
2. 以管理员身份运行。安装包会把 GUI 与守护进程复制到 `C:\Program Files\Lecoo Control Center\`,并将守护进程注册为名为 `LecooControlDaemon` 的 Windows 服务(LocalSystem,自启动)。
3. 安装完成后,从开始菜单打开 **Lecoo Control Center**,以普通用户身份启动 —— 服务已经在后台运行并接管 EC 访问。

验证服务:

```powershell
sc query LecooControlDaemon
# 应见: STATE : 4 RUNNING
```

干净卸载:Windows 设置 → 应用。安装包会自行停止并注销服务。

## 从源码构建

需要:

- Rust 稳定版(1.80+),通过 [rustup](https://rustup.rs/) 安装。
- Node.js 20+ 与 pnpm 9+(用于 GUI 前端)。
- [Tauri 2 前置依赖](https://v2.tauri.app/start/prerequisites/)。Windows 上即 MSVC 构建工具 + WebView2(Windows 11 已自带)。

```bash
git clone https://github.com/A-mi13/Lecoo-Control-Center.git
cd Lecoo-Control-Center

# 守护进程 + CLI(release)
cargo build --release -p lecoo-ec-daemon
cargo build --release -p cli

# GUI 安装包(MSI)
cd gui
pnpm install
pnpm tauri build
```

`pnpm tauri build` 输出一个 MSI:

```
target/release/bundle/msi/Lecoo Control Center_<version>_x64_en-US.msi
```

该 MSI 包含守护进程(bundle 步骤前自动重建)、来自 `libs/` 的 `inpoutx64.dll` 与 GUI 本身,并按官方安装包同样的方式注册 Windows 服务。

GUI 日常开发:`pnpm tauri dev` 在 `localhost:5173` 上启动 Vite 并打开窗口。Rust 端会重试连接守护进程;若服务未安装,连接指示会显示 "Daemon not reachable"。

## 报告 Bug

如果某处行为异常,最便捷的提交 Issue 方式来自 GUI 本身:

1. 打开 **Settings → Diagnostics → Copy diagnostics**。剪贴板会得到一个 markdown,包含 GUI 版本、OS 信息、最近的守护进程错误以及当前日志尾部。
2. 粘贴到新 Issue:<https://github.com/A-mi13/Lecoo-Control-Center/issues>。

如果问题难以稳定复现,先打开 **Verbose logging**,复现一次,再 Copy diagnostics —— 输出会包含 `debug` 级日志。旁边的 "Open log folder" 会打开 `%LOCALAPPDATA%\Lecoo Control Center\logs\`,每日轮转的日志文件在那里。

明显属于守护进程 / CLI / EC 层的问题也欢迎反馈到上游:<https://github.com/LaVashikk/Lecoo-Control-Center/issues> —— 那里关注的人更多,本仓库适用的修复也会回流。

## 架构

Cargo workspace。主要成员:

```
Lecoo-Control-Center/
├── ipc/        # 共享类型与 named-pipe IPC 协议(bincode Encode/Decode)
├── daemon/     # 后台服务:EC 驱动、IPC 服务端、服务生命周期
├── cli/        # `lecoo-ctrl` 命令行
├── gui/        # Tauri 2 桌面应用(Rust 后端 + React/TS 前端)
└── libs/       # 原生依赖(inpoutx64.dll)
```

GUI 通过与 CLI 完全相同的 named pipe(`lecoo_ctl_daemon`)与守护进程通信,因此二者可以并存。GUI 的 Rust 端拥有 1 Hz 轮询器,向 WebView 派发 `telemetry` 与 `connection-status` 事件;用户操作(设定风扇模式、应用曲线、切换配置……)通过 Tauri 命令回到同一 IPC 通道。

## 许可证

采用 [MIT License](LICENSE),与上游一致。

## 致谢

- **LaVashikk** —— [Lecoo-Control-Center](https://github.com/LaVashikk/Lecoo-Control-Center) 原作者。逆向了 ITE IT5570 / IT8987 EC 的 HRAM 布局,设计了 IPC 协议,实现了 Rust 守护进程与 `lecoo-ctrl` CLI。没有他的工作,这个分叉无从谈起;此处对 EC / 守护进程 / CLI 层做的修复也以回流上游为目标。
- **[@A-mi13](https://github.com/A-mi13)** —— 本分叉维护者;负责 Tauri 2 + React GUI、MSI 安装包以及 *关于此分叉* 中列出的守护进程改进。
- 更广泛的 Lecoo / Emdoor 笔记本社区 —— 在上游仓库贡献了主板版本与 EC offset 报告。

## 免责声明

本软件直接驱动笔记本的嵌入式控制器(EC)。错误配置 —— 例如在持续负载下将风扇钉在 0% 占空比 —— 可能导致过热与硬件永久损坏。**使用本软件即表示你接受该风险。** 本分叉维护者与上游作者均不对设备损坏负责。
