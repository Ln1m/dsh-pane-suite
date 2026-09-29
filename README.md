# dsh-pane-suite

中文 | [English](README.en.md)

右栏家族：文档查看器与内嵌浏览器

> 前置：先装 [dsh-vk-suite](https://github.com/Ln1m/dsh-vk-suite)。

## 包

| 目录 | 作用 |
|---|---|
| `dsh-viewer` | 右栏预览 Office / 网页 / 图片 / 文本 |
| `dsh-embedded-browser` | 右栏内嵌浏览器：画面是桌面外壳里的 WebView2 原生子控件，工具条由面板自绘 |

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
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.0/dsh-pane-viewer-0.1.0.tgz"
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.0/dsh-pane-browser-0.1.0.tgz"
```

装的时候若报 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`（国内出口证书注入，Node 默认不读系统证书库），先执行 `$env:NODE_OPTIONS='--use-system-ca'` 再装。

装完重启 web 实例。每个包目录里还有它自己的 README。

## 界面

![dsh-embedded-browser](dsh-embedded-browser/assets/deepseek-icon-64.png)

## 许可

MIT
