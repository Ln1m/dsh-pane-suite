# dsh-vk-viewer

A document viewer for the DSH Web client's right sidebar: Office documents, web pages, images and text all open as tabs in the right pane instead of a separate window.

It used to live inside `dsh-vk-suite`; it now ships as **its own repository**. Install the framework (contract + skeleton) first — without it this plugin registers nothing.

| Dependency | Why |
|---|---|
| `dsh-vk-contract` + `dsh-vk-layout` from `dsh-vk-suite` | The framework: slot contract and the left/right sidebar hosts |
| official `@deepseek-ai/dsh-client-ui-sidebar-right` | The right sidebar itself (the tab-type registry) |

## Install

```powershell
dsh plugin --profile web add file:<path to dsh-vk-suite>/dsh-vk-contract
dsh plugin --profile web add file:<path to dsh-vk-suite>/dsh-vk-layout
dsh plugin --profile web add file:<this repository>
```

Restart DSH afterwards. The right sidebar gains a **Viewer** tab (a file browser); picking a file from the file tree or the list opens it there.

## How it differs from the official viewer

The official `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` is a `fallback` type that only claims `dsh-resource://file/**`. This plugin's type takes over those addresses and adds Office rendering (web view or original-layout PDF) plus image zoom, while reusing the same keyed `sidebar.right.pane.tab` seats — so the tab strip, expand/collapse and ⌘W stay official.

## License

MIT
