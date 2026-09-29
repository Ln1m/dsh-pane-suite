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

装完重启 web 实例。每个包目录里还有它自己的 README。

## 界面

![dsh-embedded-browser](dsh-embedded-browser/assets/deepseek-icon-64.png)

## 许可

MIT
