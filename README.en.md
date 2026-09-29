# dsh-pane-suite

[中文](README.md) | English

Right column: document viewer and embedded browser

> Requires [dsh-vk-suite](https://github.com/Ln1m/dsh-vk-suite) first.

## Packages

| Directory | What it does |
|---|---|
| `dsh-viewer` | Preview Office, web, image and text files in the right column |
| `dsh-embedded-browser` | Embedded browser whose picture is a native WebView2 child control; the panel draws the toolbar |

## Install

```sh
# one package
dsh plugin --profile web add file:<this repo>/dsh-viewer
```

Or install the whole family on Windows PowerShell:

```powershell
./install.ps1
```

Install straight from the release, no clone needed:

```sh
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.0/dsh-viewer-0.1.0.tgz"
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.0/dsh-embedded-browser-0.1.0.tgz"
```

Restart the web instance afterwards. Each package directory carries its own README.

## Screenshots

![dsh-embedded-browser](dsh-embedded-browser/assets/deepseek-icon-64.png)

## License

MIT
