# dsh-pane-suite

中文 | [English](README.en.md)

右栏家族：文档查看器与内嵌浏览器

> 前置：先装 [dsh-vk-suite](https://github.com/Ln1m/dsh-vk-suite)。

## 包

| 目录 | 作用 |
|---|---|
| `dsh-viewer` | 右栏预览 Office / 网页 / 图片 / 文本 |
| `dsh-embedded-browser` | 右栏内嵌浏览器：画面是桌面外壳里的 WebView2 原生子控件，工具条由面板自绘 |
| `dsh-rightpane-eyes` | 右栏打开的文件在技能档那一排生成「眼睛 + 文件名」胶囊，按文件切换会话可见/隐藏 |

## 版本线

| 版本 | 对应 DSH | 说明 |
|---|---|---|
| `v0.1.3` | 0.1.7 | 本次同步：右栏两轴分格、骨架与左右栏的这批改动 |
| `v0.1.2` | 0.1.7 | 0.1.7 线的上一版 |
| `v0.1.0` | 0.1.6 | 0.1.6 线的最后一版，保留可用、不再更新 |

## 装

```sh
# 只装其中一个包
dsh plugin --profile web add file:<本仓库>/dsh-viewer
```

整族一次装完（Windows PowerShell）：

```powershell
./install.ps1
```

不克隆仓库、直接从 Release 装（一行一个包）：

```sh
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.3/dsh-viewer-0.1.3.tgz"
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.3/dsh-embedded-browser-0.1.3.tgz"
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.3/dsh-rightpane-eyes-0.1.0.tgz"
```

装的时候若报 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`（国内出口证书注入，Node 默认不读系统证书库），先执行 `$env:NODE_OPTIONS='--use-system-ca'` 再装。

装完重启 web 实例。每个包目录里还有它自己的 README。

## 界面

![dsh-embedded-browser](dsh-embedded-browser/assets/dsh-embedded-browser.png)

## 许可

MIT
