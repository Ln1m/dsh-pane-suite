# dsh-embedded-browser

> **The vk build only**: position — a right-column tab (`sidebar.right.pane.tab`); install the [dsh-vk-suite](https://github.com/Ln1m/dsh-vk-suite) contract + skeleton first.
> Conflicts: a slot renders only its highest-priority entry, and two registrations at the same priority throw; mutually exclusive with anything claiming the same position (see "How to use it / what it conflicts with" in [dsh-vk-suite](https://github.com/Ln1m/dsh-vk-suite)).

[中文](README.md) · English

![Embedded browser panel in the right column](assets/dsh-embedded-browser.png)

*Screenshot of a running DSH instance; demo content is sanitized.*

A real browser inside the right column. The panel only owns the toolbar and its own rectangle; the picture itself is a native WebView2 child control added to the main form of the DSH desktop shell (`dsh-desktop`, WinForms + WebView2) — a real view, not a screenshot mock.

## The two halves

| Half | Where | Job |
|---|---|---|
| Panel (plugin) | `lib/index.js` + `lib/client.js` | Registers the "open browser" tab in the right column, draws the toolbar, reports the panel rectangle, and runs the tab strip / address box / bookmarks front end |
| Shell | `src/App.cs` | `Controls.Add`s a WebView2 child control on the main form; multiple tabs = multiple child controls sharing one `CoreWebView2Environment` |

## Behavior

- Tabs share one browser process and one 9223 debug port (9222 stays with the DSH UI); only the active tab is visible at a time
- `target=_blank` / `window.open` opens another tab in the strip, capped at 8
- Bookmarks are a separate small WebView2 overlay owned by the shell, layered over the picture; clicking the picture, losing focus, or pressing Esc closes it
- On mount the panel probes with `{cmd:'shelf', probe:true}`; only an ack switches it to the overlay, otherwise it falls back to an in-panel DOM card (older shells)

## Panel ↔ shell protocol

Panel → shell:

| cmd | Effect |
|---|---|
| `open` / `rect` / `hide` | Place the view, follow the panel rectangle, hide it |
| `nav` | Navigate the active tab |
| `newTab` / `closeTab` / `selectTab` | Tab management |
| `shelf` | Bookmarks overlay |

Shell → panel: `{kind:'dsh-embed-state', …}` and `{kind:'dsh-embed-shelf', ack|url|closed}`.

Rectangle updates use leading-edge throttling (30 ms leading + trailing) so dragging the right column keeps the picture attached; debouncing is deliberately not used.

## Install

```sh
dsh plugin --profile web add file:<this repo>
```

The picture half needs the desktop shell: `build.ps1` compiles `src\App.cs` with `csc` into `dsh-desktop.exe` (keep the WebView2 DLLs beside it, or in `build\packages`).

## Requirements

- Windows + WebView2 Runtime
- `lib/client.js` and the shell exe must be updated as a pair — both sides of the protocol have to match
