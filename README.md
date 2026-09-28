# dsh-viewer

DSH Web 右栏的文档查看器：Office 文档、网页、图片、文本都能在右栏开成一个标签看，不用切窗口。

它从 `dsh-vk-suite` 里独立出来，是**自己一个仓**。装之前先装框架（契约 + 骨架），否则它什么都不注册。

| 依赖 | 说明 |
|---|---|
| `dsh-vk-suite` 的 `dsh-vk-contract` + `dsh-vk-layout` | 框架：槽位契约与左/右栏宿主 |
| 官方 `@deepseek-ai/dsh-client-ui-sidebar-right` | 右栏本体（标签类型注册表） |

## 装

```powershell
dsh plugin --profile web add file:<dsh-vk-suite 路径>/dsh-vk-contract
dsh plugin --profile web add file:<dsh-vk-suite 路径>/dsh-vk-layout
dsh plugin --profile web add file:<本仓库>
```

装完重启 DSH。右栏会多一个「查看器」标签，点开即是文件浏览器；从文件栏或列表里点文件也会进这里。

## 和官方查看器的区别

官方的 `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` 是 fallback 类型，只认 `dsh-resource://file/**`。本插件的类型优先接管，额外做了 Office 文档的网页视图 / 原版式 PDF 转换与图片缩放，并沿用同一套 `sidebar.right.pane.tab` keyed 席位，所以 Tab 条、开合、⌘W 都还是官方那套。

## License

MIT
