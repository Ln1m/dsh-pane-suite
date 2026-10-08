# dsh-pane-suite

[中文](README.md) | English

Right column: document viewer and embedded browser

> Requires [dsh-vk-suite](https://github.com/Ln1m/dsh-vk-suite) first.

## Packages

| Directory | What it does |
|---|---|
| `dsh-viewer` | Preview Office, web, image and text files in the right column |
| `dsh-embedded-browser` | Embedded browser whose picture is a native WebView2 child control; the panel draws the toolbar |
| `dsh-rightpane-eyes` | An eye capsule per file opened in the right column: toggle whether that file is visible to the session |

## Release lines

| Release | DSH line | Notes |
|---|---|---|
| `v0.1.3` | 0.1.7 | This sync: right-column two-axis docking, plus this batch of skeleton and column changes |
| `v0.1.2` | 0.1.7 | Previous release of the 0.1.7 line |
| `v0.1.0` | 0.1.6 | Last release of the DSH 0.1.6 line; stays usable, no further updates |

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
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.3/dsh-viewer-0.1.3.tgz"
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.3/dsh-embedded-browser-0.1.3.tgz"
dsh plugin --profile web add "https://github.com/Ln1m/dsh-pane-suite/releases/download/v0.1.3/dsh-rightpane-eyes-0.1.0.tgz"
```

If the install fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (a TLS-intercepting proxy; Node does not read the system CA store by default), run `$env:NODE_OPTIONS='--use-system-ca'` first.

Restart the web instance afterwards. Each package directory carries its own README.

## Screenshots

![dsh-embedded-browser](dsh-embedded-browser/assets/dsh-embedded-browser.png)

## License

MIT
