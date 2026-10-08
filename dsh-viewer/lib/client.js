// dsh-viewer — 右栏查看器：Office 文档 / 网页 / 图片 / 文本预览。
window.__ModuleLoader__.load({
	id: 'dsh-viewer',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		const react = require('react');
		const contract = require('dsh-vk-contract');
		const h = react.createElement;
		const VK = contract.VK;
		const vkCard = contract.vkCard;
		const ctxRef = { current: null };

		const _VK_ICONS = {
			menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
			tasks: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
			folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
			folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
			chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
			eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
			eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
			search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
			globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
			edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
			trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
			check: '<path d="M20 6 9 17l-5-5"/>',
			close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
			save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
			columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>',
			fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
			file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',
			fileText: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
			image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
			video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
			music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
			archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
			lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
			tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
			atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
			terminal: '<path d="m4 17 6-5-6-5"/><path d="M12 19h8"/>',
			open: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
			zoomIn: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
			zoomOut: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
			gear: '<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
			gitBranch: '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
			box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
			chevronLeft: '<path d="m15 18-6-6 6-6"/>',
			// 侧栏/面板类图标（左侧栏 Tab 条最右端的「打开拓展栏」按钮用）
			panelRight: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="15" y1="4" x2="15" y2="20"/>',
			// 拓展栏顶栏第 4 颗按钮：上下分界（上=官方拓展栏，下=命令行）
			panelBottom: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="13" x2="21" y2="13"/><path d="m6.6 15.6 2.4 1.7-2.4 1.7" stroke-width="1.6"/><line x1="11" y1="19" x2="15" y2="19" stroke-width="1.6"/>',
			chevronRight: '<path d="m9 18 6-6-6-6"/>',
			chevronDown: '<path d="m6 9 6 6 6-6"/>',
			chevronUp: '<path d="m18 15-6-6-6 6"/>',
			arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
			hardDrive: '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
			refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
			monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
			home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'
		};
		function VIcon({ name, size = 14 }) {
			const d = _VK_ICONS[name];
			if (!d) return null;
			return h("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flex: "none", display: "block" }, dangerouslySetInnerHTML: { __html: d } });
		}
		const CSS = [
			// ── 右栏查看器 tab 正文（路线 A：Office 转换 / 网页）────────────
			"body{--vk-accent:var(--dsw-alias-accent,var(--dsw-alias-state-business-primary));--vk-accent-ring:color-mix(in srgb,var(--vk-accent) 22%,transparent);--vk-accent-soft:color-mix(in srgb,var(--vk-accent) 12%,transparent);--vk-ok:#73c991;--vk-danger:var(--dsw-alias-state-error-primary,#f14c4c);--vk-danger-soft:color-mix(in srgb,var(--vk-danger) 35%,transparent);--vk-fg:var(--dsw-alias-label-primary);--vk-fg2:var(--dsw-alias-label-secondary);--vk-fg3:var(--dsw-alias-label-tertiary);--vk-line:var(--dsw-alias-border-l1);--vk-line2:var(--dsw-alias-border-l2);--vk-bg-hover:var(--dsw-alias-interactive-bg-hover);--vk-r-xs:4px;--vk-r-sm:6px;--vk-r-md:8px;--vk-r-lg:12px;--vk-r-pill:999px;--vk-fs-xs:11px;--vk-fs-sm:12px;--vk-fs-md:13px;--vk-fs-lg:14px;--vk-dur:.12s;--vk-ease:cubic-bezier(.2,.7,.3,1);--vk-fade:background-color var(--vk-dur) var(--vk-ease),color var(--vk-dur) var(--vk-ease),border-color var(--vk-dur) var(--vk-ease),opacity var(--vk-dur) var(--vk-ease);--vk-ring:0 0 0 2px var(--vk-accent-ring);}.vk_viewerTab{width:100%;height:100%;display:flex;flex-direction:column;min-height:0}",
			".vk_viewerBar{display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:var(--vk-fs-xs);color:var(--dsw-alias-label-tertiary);border-bottom:0.5px solid var(--dsw-alias-border-l3);flex:none;min-width:0}",
			".vk_viewerFrame{flex:1;min-height:0;width:100%;border:0;background:var(--dsw-alias-bg-base)}",
			".vk_pickRow{display:flex;gap:6px;justify-content:flex-end;min-width:0;container-type:inline-size}@container (width<=360px){.vk_pickBtn{padding:4px 8px;font-size:var(--vk-fs-xs)}}",
			".vk_pickBtn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:var(--vk-r-sm);font-size:var(--vk-fs-sm);padding:4px 12px;font-family:inherit;transition:background-color .12s,border-color .12s,color .12s}",
			".vk_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}",
			".vk_primaryBtn{background:var(--vk-accent);color:#fff;border-color:var(--vk-accent);font-weight:600}",
			".vk_primaryBtn:hover{background:var(--vk-accent);color:#fff;filter:brightness(1.1);border-color:var(--vk-accent)}",
			".vk_primaryBtn:disabled{opacity:.45;cursor:not-allowed;filter:none}",
			// ── 图片缩放面板（上一版中栏查看器的样式原样捞回；棋盘格底 + 抓手 + 工具条）──
			// ── 查看器工具条：官方「打开方式 / 显示方式」胶囊 + 下拉列表 ─────────────
			// 抄的是官方 documentpreview 里那颗「打开方式」胶囊：实测 DOM
			// `<button class="dhJKeW_tool dhJKeW_viewerTool" aria-label="打开方式" data-document-viewer-menu="true">`
			// 高 28 / 圆角 28px / 字号 12px / 透明底，点开是 `role=menu` 的列表（官方 md 那档给
			// Markdown / 代码 / 纯文本三条，选中项带 _selected）。
			//
			// 为什么非改不可：原先这里直接排一排 `.vk_rowBtn`，而 `.vk_rowBtn` 是 **20×20 的图标**按钮
			// （`.vk_rowBtn{width:20px;height:20px}`）→ 文字按钮被压进 20px 的方框、两颗之间只隔 26px。
			// 右栏 720px 时实测：「用 Office 打开」按钮 rect 宽 20 而 scrollWidth 26（溢出），
			// 「所在文件夹」在 20px 盒里换行 —— 窄栏下就是用户看到的「排一排按钮、变形」。
			".vk_viewerBar{position:relative}",
			".vk_viewMode{position:relative;flex:none;margin-left:auto}",
			".vk_viewModeBtn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:none;border-radius:28px;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:var(--vk-fs-sm);cursor:pointer;transition:background-color .12s,color .12s}",
			".vk_viewModeBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_viewModeBtnOn{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			// 菜单观感同样照官方量：bg rgb(53,54,56)、圆角 20px、内边距 4px、外发光
			// rgba(255,255,255,.06) 0 0 0 .5px + rgba(0,0,0,.04) 0 3px 8px
			".vk_viewMenu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:218px;padding:4px;border-radius:20px;background:var(--dsw-specific-menu);box-shadow:rgba(255,255,255,.06) 0 0 0 .5px,rgba(0,0,0,.04) 0 3px 8px 0,var(--dsw-shadow-lv3);display:flex;flex-direction:column;animation:vkFadeIn .1s ease-out}",
			".vk_viewMenuItem{display:flex;align-items:center;gap:8px;width:100%;height:34px;padding:0 10px;border:none;border-radius:var(--vk-r-lg);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:var(--vk-fs-sm);text-align:left;cursor:pointer;white-space:nowrap}",
			".vk_viewMenuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_viewMenuItemOn{color:var(--vk-accent)}",
			".vk_viewMenuLabel{overflow:hidden;text-overflow:ellipsis}",
			".vk_viewMenuCheck{margin-left:auto;display:inline-flex;color:var(--vk-accent)}",
			".vk_viewMenuSep{height:1px;margin:4px 8px;background:var(--dsw-alias-border-l2);flex:none}",
			".vk_imgToolbar{display:flex;align-items:center;gap:2px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap;flex:none}",
			".vk_imgToolbarSpacer{flex:1;min-width:8px}",
			".vk_imgZoomBtn{display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:var(--vk-fs-sm);padding:4px 7px;border-radius:var(--vk-r-sm);cursor:pointer;font-family:inherit}",
			".vk_imgZoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_imgZoomBtnOn{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_imgZoomPct{font-size:var(--vk-fs-xs);color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));min-width:52px;text-align:center;font-variant-numeric:tabular-nums}",
			".vk_imgWrap{flex:1;min-height:0;display:flex;overflow:auto;background:repeating-conic-gradient(var(--dsw-alias-interactive-bg-hover) 0% 25%,transparent 0% 50%) 0 0/22px 22px;position:relative;cursor:grab}",
			".vk_imgWrap.vk_imgPan{cursor:grabbing}",
			".vk_imgWrap img{display:block;margin:auto;user-select:none;-webkit-user-drag:none;box-shadow:0 2px 16px rgba(0,0,0,.35);background:#fff;border-radius:var(--vk-r-xs)}",
			".vk_empty{padding:32px 20px;font-size:var(--vk-fs-sm);line-height:2;color:var(--dsw-alias-label-tertiary);text-align:center;white-space:pre-wrap}",
			// ── 键盘聚焦可见态（统一 accent 光圈） ──────────────────────
			".vk_tabBtn:focus-visible,.vk_railBtn:focus-visible,.vk_treeBtn:focus-visible,.vk_rowBtn:focus-visible,.vk_pickBtn:focus-visible,.vk_editBtn:focus-visible,.vk_tabClose:focus-visible{outline:2px solid var(--vk-accent-ring);outline-offset:-2px}",
			".vk_imgToolbar{display:flex;align-items:center;gap:2px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}",
			".vk_imgZoomBtn{display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:var(--vk-fs-sm);padding:4px 7px;border-radius:var(--vk-r-sm);cursor:pointer}",
			".vk_imgZoomBtn:disabled{opacity:.4;cursor:default}",
		].join("");

		(function injectViewerCss() {
			if (typeof document === 'undefined') return;
			const plugin = 'dsh-viewer';
			for (const old of document.querySelectorAll('style[data-plugin="' + plugin + '"]')) { try { old.remove(); } catch { /* ignore */ } }
			const tag = document.createElement('style');
			tag.dataset.plugin = plugin;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		})();

		function vkImageSrcOf(address, filePath) {
			const target = filePath !== null && filePath !== undefined ? filePath : vkFilePathOfAddress(address);
			if (target === null) return address;
			return "/vscode-files/file?path=" + encodeURIComponent(target);
		}
		/** 从 `/vscode-files/file?path=…` 这类自研 src 里取回磁盘路径（取不到给 null）。 */
		function vkImagePathOfSrc(src) {
			try {
				const u = new URL(String(src), "http://localhost");
				const p = u.searchParams.get("path");
				return p !== null && p.length > 0 ? p : null;
			} catch { return null; }
		}
		/**
		 * 用系统默认程序打开一个磁盘文件（Office 交给本机 Word/Excel/PowerPoint 原生打开）。
		 * 走自研 host 路由 `POST /vscode-files/open-native`（见 dsh-host-files）：
		 * 官方的 `/open-in-app/open` 只接受目录、且 app 表是编译期常量，做不到「打开这个文件」。
		 */
		function vkOpenNative(path) {
			if (typeof path !== "string" || path.length === 0) return;
			try {
				globalThis.__VK_OPEN_NATIVE__ = { at: new Date().toISOString(), path: path };
				fetch("/vscode-files/open-native", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path: path })
				}).then((r) => r.json())
					.then((d) => { try { globalThis.__VK_OPEN_NATIVE__.result = d; } catch { /* ignore */ } })
					.catch((e) => { try { globalThis.__VK_OPEN_NATIVE__.result = String(e && e.message ? e.message : e); } catch { /* ignore */ } });
			} catch { /* 路由缺失时静默 */ }
		}
		/**
		 * 在资源管理器中打开某个文件**所在的文件夹**。
		 *
		 * 用官方 host 的 `POST /open-in-app/open`（app 目录里 Windows 上是 `explorer`）。
		 * ⚠️ 实测两个硬约束（源码 `lib/index.js` 的 open 路由）：① 只接受**目录**——
		 * 传文件路径会被 `isAbsolute + stat().isDirectory()` 判掉，直接 404 `directory does not exist`；
		 * ② 所以大图（>64MB）的出路是「打开所在文件夹」再由系统看图器打开，这条路不经
		 * `/vscode-files/file`，不受 64MB（MAX_BLOB_BYTES）预览上限影响。
		 */
		function vkRevealInExplorer(path) {
			if (typeof path !== "string" || path.length === 0) return;
			const dir = parentOfPath(path);
			if (typeof dir !== "string" || dir.length === 0) return;
			try {
				globalThis.__VK_REVEAL__ = { at: new Date().toISOString(), file: path, dir: dir };
				fetch("/open-in-app/open", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ app: "explorer", path: dir })
				}).then((r) => { try { globalThis.__VK_REVEAL__.status = r.status; } catch { /* ignore */ } })
					.catch((e) => { try { globalThis.__VK_REVEAL__.status = "error " + String(e && e.message ? e.message : e); } catch { /* ignore */ } });
			} catch { /* 路由缺失时静默 */ }
		}

		/** 右栏查看器 tab 类型的静态身份（id 与正文注册的 key 必须一致）。 */
		const VIEW_TAB_ID = VK.rightbar.viewer;
		const VIEW_TAB_KIND = "anoslide.view";
		/**
		 * 左栏正文 Tab 的持久化键。
		 * 换键名（v2）而不是沿用旧键：旧键里存的缺省值历史上是 "files"（刷新一次就会被写死成文件栏），
		 * 沿用旧键就会永远开局停在文件栏。换键 = 旧值自然作废，无需迁移代码，首帧一定落在会话栏。
		 */
		const VK_SIDEBAR_TAB_KEY = "vk.layout.vkSidebarTab.v2";
		/** 拓展栏展开状态（自研自己持久化：官方不持久化，实测每次加载都是收起）。 */
		const VK_RIGHT_PANE_KEY = "vk.layout.rightPaneOpen.v1";

		/** 自研私有子插槽：官方会话浏览器（WorkspaceBrowser）镜像落点（左栏「会话」Tab 的正文）。 */
		const VK_SIDEBAR_BROWSER = "vk.sidebar.browser";
		/** 自研私有子插槽：官方「添加工作区」弹层里那个目录选择洞的镜像落点。 */
		const VK_SIDEBAR_DIRFLOW = "vk.sidebar.dirflow";

		/** 该扩展名是否走自研查看器（Office 转换）。 */
		const VK_OFFICE_EXT = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "vsd", "vsdx", "vsdm"]);
		/** 该扩展名是否走自研图片缩放面板（官方 viewer 的图片分支无缩放，实测 src 是 blob:、无任何缩放控件）。 */
		const VK_IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif", "svg"]);
		/**
		 * 音视频：官方 viewer 注册表里只有 text/code/markdown/html/image/pdf 六类，
		 * 音视频落到 text 兜底只会显示「非文本文件，暂时无法预览」，所以由自研接管（host 侧走流式 + Range）。
		 * 只收浏览器原生能解的容器：mkv/avi/rmvb 这类放进去也只会得到一块黑屏。
		 */
		const VK_VIDEO_EXT = new Set(["mp4", "webm", "ogv", "m4v", "mov"]);
		const VK_AUDIO_EXT = new Set(["mp3", "wav", "flac", "ogg", "oga", "m4a", "aac", "opus"]);
		/**
		 * 本地文件里「应该交给系统默认程序打开」的扩展名：Office（Word/Excel/PPT 原生打开才能改版式）
		 * 与本地网页 html/htm（交给默认浏览器）。⚠️ http(s) 地址**不给**这个入口——
		 * 那是宿主自己的页面（如钱包充值页），塞给浏览器没有意义。
		 */
		function vkNativeOpenLabel(ext) {
			if (VK_OFFICE_EXT.has(ext)) return "用 Office 打开";
			if (ext === "html" || ext === "htm") return "用浏览器打开";
			return null;
		}
		/** 该地址是否是网页（http/https）。 */
		function vkIsWebAddress(address) {
			return typeof address === "string" && /^https?:\/\//i.test(address);
		}
		/** 地址 → 扩展名（小写，不含点）。 */
		function vkExtOfAddress(address) {
			if (typeof address !== "string") return "";
			const noQuery = address.split(/[?#]/)[0];
			const seg = noQuery.split("/").pop() || "";
			const dot = seg.lastIndexOf(".");
			return dot >= 0 ? seg.slice(dot + 1).toLowerCase() : "";
		}
		/**
		 * 该地址是否由自研查看器接管：Office 转换、http(s) 网页、以及图片（自研缩放面板）。
		 * 其余 dsh-resource 地址继续交给官方 sidebar-documentpreview（文本/代码/PDF/Markdown）。
		 */
		function vkShouldClaim(address) {
			if (vkIsWebAddress(address)) return true;
			const ext = vkExtOfAddress(address);
			// ⚠️ 本地 html/htm **不要**接管（实测踩过）：官方 documentpreview 的 html 正文走的是 host 的
			// `/vscode-files/fs/<目录>/<文件>` 网页预览路由（带 MIME 白名单 + 自动注入 `<base href>`，
			// 相对资源能正确加载）；自研这条正文用的是 `/vscode-files/file`，那个路由的 MIME 表里没有
			// html → 响应 `application/octet-stream` → **浏览器直接下载文件、拓展栏一片空白**。
			// 所以本地 html 交回官方，自研只负责 Office / 图片 / 音视频。
			return VK_OFFICE_EXT.has(ext) || VK_IMAGE_EXT.has(ext) || VK_VIDEO_EXT.has(ext) || VK_AUDIO_EXT.has(ext);
		}
		/**
		 * 地址 → 可读文本：`dsh-resource://file/session/<sid>/<编码路径>` 里的路径段是
		 * **percent-encoded** 的（`D%3A%2F…%2F%E4%B8%AD%E6%96%87.docx`），任何「把地址当文案显示」的
		 * 地方都必须先解码，否则标签条上出现的就是一串 `%E4%B8%AD` （实测踩到：中文文件名整条编码串）。
		 * 解不出来（路径里含裸 `%`）就回退原串，绝不抛。
		 */
		function vkDecodeAddress(address) {
			const raw = String(address);
			try { return decodeURIComponent(raw); } catch { return raw; }
		}
		/** 标签页标题：网页用主机名，Office 用文件名。 */
		function vkViewTitle(address) {
			if (vkIsWebAddress(address)) {
				try { return new URL(address).host; } catch { return "网页"; }
			}
			// ⚠️ 必须**先整串解码再切末段**：编码地址里的 `/` 是 `%2F`，先按 `/` 切会把整条路径当成一段
			// （`D%3A%2F…%2F%E4%B8%AD%E6%96%87.docx` 解码前没有分隔符可切）。解码后 Windows 盘符 `D:`、
			// 根内相对路径（`probe-zoom.png`）都能落到同一个末段逻辑上。
			const segs = vkDecodeAddress(address).split(/[\\/]+/).filter((s) => s.length > 0);
			return segs.length > 0 ? segs[segs.length - 1] : "文档";
		}

		/**
		 * 右栏查看器 tab 类型定义（两步注册的第一步）。
		 * patterns 只声明本类型真正要接管的地址：Office 文件地址、音视频、本地 html 与 http(s) 网页；
		 * 其余 dsh-resource://file/** 由官方 sidebar-documentpreview 的 fallback 类型接。
		 *
		 * ⚠️ 官方匹配器的语义（源码 `matcherFor`）：含 `:` 的 pattern 用 picomatch 匹配**整串地址**，
		 * 不含 `:` 的匹配 URL 的 pathname（且带 basename 选项）；而 **picomatch 的单星号不跨 `/`**——
		 * 写 `http://*` 时 `http://127.0.0.1:3098/` 与 `https://a.com/x/y` 都不匹配（实测：
		 * openResource 直接抛 `no registered tab type claims "http://…"`）。跨路径段必须用 `**`。
		 */
		function vkViewTabDefinition() {
			return {
				id: VIEW_TAB_ID,
				kind: VIEW_TAB_KIND,
				patterns: ["dsh-resource://file/**", "http://**", "https://**", "*"],
				priority: "extension",
				canOpen: (address) => vkShouldClaim(address),
				title: (address) => vkViewTitle(address)
			};
		}

		/**
		 * 解析官方文件地址 `dsh-resource://file/session/<会话>/<编码路径>`。
		 * 自研查看器的正文是 host 侧路由（/vscode-files/office、/vscode-files/file），它们要的是**磁盘路径**，
		 * 不是资源地址，所以要在这里把地址还原成文件系统路径（逐段解码，保留 Windows 盘符）。
		 * @param address - 资源地址。
		 * @returns 磁盘路径，或 null（不是文件地址时）。
		 */
		function vkFilePathOfAddress(address) {
			const prefix = "dsh-resource://file/session/";
			if (typeof address !== "string" || !address.startsWith(prefix)) return null;
			const rest = address.slice(prefix.length);
			const cut = rest.indexOf("/");
			if (cut < 0) return null;
			const encoded = rest.slice(cut + 1);
			const decoded = encoded.split("/").map((seg) => { try { return decodeURIComponent(seg); } catch { return seg; } }).join("/");
			// Windows 盘符在地址里是 `D:`，host 的路径解析两者都收，这里统一转成反斜杠形式更稳。
			//
			// ⚠️ 两种地址都要认（实测）：官方 viewer 与文件栏对**工作区根内**的文件写**相对路径**
			// （`.../session/<sid>/probe-zoom.png`），工作区根外才写绝对路径（`.../session/<sid>/D:/…`）。
			// 相对路径必须还原成绝对路径再交给 host 的 `/vscode-files/*`（它们要磁盘路径），否则会去
			// 服务进程的工作目录下找文件而 404/空。
			if (!/^[A-Za-z]:[\\/]/.test(decoded) && !decoded.startsWith("/")) {
				const cwd = vkCurrentSessionCwd();
				if (cwd.length > 0) return cwd.replace(/[\\/]+$/, "") + "\\" + decoded.replace(/\//g, "\\");
			}
			return decoded;
		}

		/**
		 * 查看器工具条的「打开方式 / 显示方式」下拉（官方 documentpreview 那颗胶囊的同款观感与交互）。
		 * items: `{ key?, label, title?, on?, run? }`；`on:true` 画成当前选中态（右侧打勾）。
		 * 关掉菜单的三种途径：点菜单外的任意处（捕获阶段 mousedown）、Esc、点任意一项。
		 */

		/** 是否盘根本身（`D:\` / `C:/`）。 */
		function isRootDriveOf(p) {
			return typeof p === "string" && /^[A-Za-z]:[\\/]$/.test(p);
		}
		/** 上一级目录（盘根返回自身；没有分隔符时原样返回）。 */
		function parentOfPath(p) {
			const s = String(p === null || p === undefined ? "" : p).replace(/[\\/]+$/, "");
			const cut = Math.max(s.lastIndexOf("\\"), s.lastIndexOf("/"));
			if (cut < 0) return s;
			const head = s.slice(0, cut);
			return /^[A-Za-z]:$/.test(head) ? head + "\\" : head;
		}

		// ── 右栏网页 / HTML 预览的缩放（2026-09-12 第二轮：换成「浏览器原生语义」的 iframe zoom）──
		//
		// 用户否掉了上一版的 transform:scale（那是"视觉放大"）。这一版的施加点是 **iframe 元素自身的
		// style.zoom**：CSS zoom 真正改变子帧的布局视口、按比例重排，并按新的 devicePixelRatio 重新
		// 栅格化 —— 这正是 Chrome 的 Ctrl+滚轮 / Ctrl+±/0 那条机制。以下都是 CDP 真键鼠 + 真 iframe 实测：
		//   ① 父页给 iframe 元素设 zoom:2（外层 400×300，flex:1 布局下同样）：元素盒子**不变** 400×300，
		//      内部视口按 1/zoom 收缩（innerWidth 400→200、innerHeight 300→150）、devicePixelRatio 1→2；
		//      zoom:0.5 → 内部 800×600、dpr 0.5；复位（style.zoom=""）后各读数原样回 1。
		//      内部滚动条照常可用（900px 内容、缩放后视口 150px 时 scrollTop 能到 750）。
		//   ② 跨源同一套语义：用 opaque origin 的 data: iframe 复测（父页读到 contentDocument === null），
		//      子帧 postMessage 自报 zoom:2 时 w=200 h=150 dpr=2、盒子仍 400×300 —— 这条只改父页侧样式，
		//      不碰 iframe 内部，所以跨源读不到 document 也照样成立。
		//   ③ 反面（同样是实测）：只改 iframe **内部** documentElement 的 zoom，内部视口**不缩**
		//      （innerWidth 仍 400）、dpr 不变 —— 内容被整体放大后溢出/裁掉一角，还是"视觉放大"；
		//      旧实现的 body transform:scale + 反比宽高同理（200px 盒子渲染成 400px、100% 盒子变 800px）。
		//      两条旧路径**已整段删除**，避免与 zoom 叠加成 1.25ⁿ。
		//
		// 事件怎么进来（实测，决定下面两条分支）：
		//   · 滚轮不会从 iframe 冒泡到父页：指针在跨源 iframe 上时父页 mousemove / wheel 计数都是 0。
		//     同源 iframe 可以往它内部装非被动 wheel（真 Ctrl+滚轮命中 1 次、defaultPrevented=true）。
		//   · 父页同样收不到跨源 iframe 内的 keydown（真鼠标点进子帧后，父页 keydown 日志为空）。
		//     所以跨源只能「Ctrl 按住时铺一层透明捕获层」在父页拦，Ctrl 的按下/松开由父页 keydown/keyup 感知。
		//     ⚠️ 已知边界（实测）：焦点进了跨源页之后父页再也听不到 Ctrl —— 跨源页要**先按住 Ctrl**（父页这时
		//     还看得见）再滚；同源页没有这个限制，监听装在子帧内部。
		const PAGE_ZOOM = new Map();
		/**
		 * 缩放诊断（给命令行面板标题行那行字用；命令行没开时就留在内存里，排障可从控制台读）。
		 * 用独立变量而不是 store，是因为本段在命令行面板的 store 之前定义，不能提前引用它。
		 */
		const vkZoomNote = { text: "", store: null, set(text) { this.text = String(text); if (this.store !== null) this.store.setDiag(String(text)); } };
		/** 最近一次被滚轮/捕获层缩放过的那一帧：父页键盘只认它（守卫条件之一，见 attachFrameZoom）。 */
		let vkZoomLastFrame = null;
		/** 同一个 iframe window 上装过的内部监听（window → handlers）；换 src / 重装时先卸旧的，免得叠加成 1.25ⁿ。 */
		const vkFrameZoomWins = new Map();
		function pageZoomOf(address) {
			const v = PAGE_ZOOM.get(String(address));
			return Number.isFinite(v) ? clampZoom(v, ZOOM_MIN, ZOOM_MAX) : 1;
		}
		function setPageZoom(address, z) {
			PAGE_ZOOM.set(String(address), clampZoom(z, ZOOM_MIN, ZOOM_MAX));
		}
		/** 缩放施加点：iframe **元素**自身（父页侧；同源/跨源同一套语义，见上面实测）。 */
		function applyFrameZoom(frame, zoom) {
			try {
				if (frame === null || frame === undefined) return false;
				frame.style.zoom = zoom <= 1.0001 ? "" : String(zoom);
				return true;
			} catch { return false; }
		}
		/** Ctrl+加号 / 减号 / 0 → 目标比例（浏览器习惯）；不是这三个键就返回 null，调用方原样放行。 */
		function zoomForKey(current, event) {
			const key = String(event !== null && event !== undefined && event.key !== undefined ? event.key : "");
			const code = String(event !== null && event !== undefined && event.code !== undefined ? event.code : "");
			if (key === "+" || key === "=" || key === "Add" || code === "Equal" || code === "NumpadAdd") return clampZoom(current * ZOOM_BTN_STEP, ZOOM_MIN, ZOOM_MAX);
			if (key === "-" || key === "_" || key === "Subtract" || code === "Minus" || code === "NumpadSubtract") return clampZoom(current / ZOOM_BTN_STEP, ZOOM_MIN, ZOOM_MAX);
			if (key === "0" || code === "Digit0" || code === "Numpad0") return 1;
			return null;
		}
		/**
		 * 给一个 iframe 装缩放：同源走子帧内部监听，跨源走父页透明捕获层，键盘两条路都接。
		 * @returns {() => void} 卸载函数（换 src 后 document 是新的，调用方在 load 时重装）
		 */
		function attachFrameZoom(frame, address) {
			if (frame === null || frame === undefined) return () => {};
			const offs = [];
			const setNote = (zoom, suffix) => {
				vkZoomNote.set("网页缩放 " + String(Math.round(zoom * 100)) + "%" + (suffix === undefined ? "" : String(suffix)) + " · Ctrl+0 复位");
			};
			/** 按倍数步进一次：改状态 + 施加到 iframe + 记诊断；返回新比例。 */
			const step = (factor, suffix) => {
				const next = clampZoom(pageZoomOf(address) * factor, ZOOM_MIN, ZOOM_MAX);
				setPageZoom(address, next);
				applyFrameZoom(frame, next);
				vkZoomLastFrame = frame;
				setNote(next, suffix);
				return next;
			};
			// 同源判定只看一处：跨源 iframe 的 contentDocument 是 null（**不抛异常**），内部监听也就装不上
			let doc = null;
			try { doc = frame.contentDocument; } catch { doc = null; }
			let win = null;
			if (doc !== null && doc !== undefined) { try { win = frame.contentWindow; } catch { win = null; } }
			if (win !== null && win !== undefined) {
				// ① 同源：wheel / keydown 都装进子帧内部（焦点在页面里也生效；不按 Ctrl 一律放行）
				const old = vkFrameZoomWins.get(win);
				if (old !== undefined && old !== null) {
					try { win.removeEventListener("wheel", old.wheel, { passive: false }); } catch { /* ignore */ }
					try { win.removeEventListener("keydown", old.key, true); } catch { /* ignore */ }
					vkFrameZoomWins.delete(win);
				}
				const onWheel = (event) => {
					try {
						// 不按 Ctrl：滚轮保持翻页原义，绝不 preventDefault
						if (event.ctrlKey !== true && event.metaKey !== true) return;
						event.preventDefault();
						step(wheelZoomFactor(event.deltaY, event.deltaMode), "");
					} catch { /* 缩放失败绝不影响页面本身 */ }
				};
				const onKey = (event) => {
					try {
						if (event.ctrlKey !== true && event.metaKey !== true) return;
						const next = zoomForKey(pageZoomOf(address), event);
						if (next === null) return;
						event.preventDefault();
						setPageZoom(address, next);
						applyFrameZoom(frame, next);
						vkZoomLastFrame = frame;
						setNote(next, "");
					} catch { /* ignore */ }
				};
				try {
					win.addEventListener("wheel", onWheel, { passive: false });
					win.addEventListener("keydown", onKey, true);
					vkFrameZoomWins.set(win, { wheel: onWheel, key: onKey });
					offs.push(() => {
						try { win.removeEventListener("wheel", onWheel, { passive: false }); } catch { /* ignore */ }
						try { win.removeEventListener("keydown", onKey, true); } catch { /* ignore */ }
						if (vkFrameZoomWins.get(win) !== undefined) vkFrameZoomWins.delete(win);
					});
				} catch { /* 装不进去：交给下面的捕获层 */ }
			}
			// ② 跨源：Ctrl 按住 → 铺一层透明捕获层在父页拦滚轮（指针在跨源帧上时父页收不到任何鼠标事件，
			//    这是唯一一条路）。松开 Ctrl 立刻 pointer-events:none，页面交互一字不改。
			let setOverlay = () => {};
			if (win === null || win === undefined) {
				const parent = frame.parentElement;
				if (parent !== null && parent !== undefined && typeof parent.appendChild === "function") {
					const overlay = document.createElement("div");
					overlay.setAttribute("data-vk-frame-overlay", "true");
					overlay.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;display:none;pointer-events:none;background:transparent;";
					overlay.addEventListener("wheel", (event) => {
						try {
							if (event.ctrlKey !== true && event.metaKey !== true) return;
							event.preventDefault();
							step(wheelZoomFactor(event.deltaY, event.deltaMode), "（跨源页）");
						} catch { /* ignore */ }
					}, { passive: false });
					setOverlay = (on) => {
						try {
							overlay.style.display = on === true ? "block" : "none";
							overlay.style.pointerEvents = on === true ? "auto" : "none";
						} catch { /* ignore */ }
					};
					try {
						// 捕获层贴在 iframe 的父节点上（它本来就是 relative 的定位上下文）
						if (parent.style.position === "") parent.style.position = "relative";
						parent.appendChild(overlay);
						offs.push(() => { try { overlay.remove(); } catch { /* ignore */ } });
					} catch { /* ignore */ }
				}
			}
			// ③ 父页键盘：Ctrl+±/0（与滚轮共用同一套比例状态）。守卫只认三种情形之一 —— 焦点在这一帧 /
			//    事件落在我们的查看器里 / 刚刚用滚轮缩放过这一帧；免得把中栏和输入框的 Ctrl 组合键抢走。
			const onParentKey = (event) => {
				try {
					const held = event.ctrlKey === true || event.metaKey === true;
					if (event.type === "blur") { setOverlay(false); return; }
					if (event.type === "keydown") {
						if (held !== true) { setOverlay(false); return; }
						setOverlay(true); // 同源时是空操作；跨源时这一下才让捕获层接管滚轮
						const next = zoomForKey(pageZoomOf(address), event);
						if (next === null) return;
						const target = event.target;
						const owner = frame.parentElement;
						const inViewer = target !== null && target !== undefined &&
							(target === frame || (owner !== null && owner !== undefined && typeof owner.contains === "function" && owner.contains(target) === true));
						if (document.activeElement !== frame && vkZoomLastFrame !== frame && inViewer !== true) return;
						event.preventDefault();
						setPageZoom(address, next);
						applyFrameZoom(frame, next);
						vkZoomLastFrame = frame;
						setNote(next, "");
						return;
					}
					// keyup：松开 Ctrl 就把捕获层收起来
					if (held !== true) setOverlay(false);
				} catch { /* 缩放失败绝不影响页面本身 */ }
			};
			try {
				window.addEventListener("keydown", onParentKey, true);
				window.addEventListener("keyup", onParentKey, true);
				window.addEventListener("blur", onParentKey, true);
				offs.push(() => {
					try { window.removeEventListener("keydown", onParentKey, true); } catch { /* ignore */ }
					try { window.removeEventListener("keyup", onParentKey, true); } catch { /* ignore */ }
					try { window.removeEventListener("blur", onParentKey, true); } catch { /* ignore */ }
				});
			} catch { /* ignore */ }
			applyFrameZoom(frame, pageZoomOf(address)); // 换 src / 重装后把当前比例重新施加到新文档
			return () => {
				for (const off of offs) { try { off(); } catch { /* ignore */ } }
				if (vkZoomLastFrame === frame) vkZoomLastFrame = null;
			};
		}

		const ZOOM_MIN = 0.25;        // 下限 25%
		const ZOOM_MAX = 5;           // 上限 500%
		const ZOOM_BTN_STEP = 1.25;   // 工具条 ＋/－ 一档、以及滚轮一档（归一化 100px）的倍数
		const ZOOM_WHEEL_MAX = 600;   // 单次滚轮增量的归一化上限（≈3.8×，防个别设备给出离谱值）
		/** 缩放比例钳制到 [min,max]；非法输入回落到下限（纯函数）。 */
		function clampZoom(z, min, max) {
			const lo = Number.isFinite(min) ? min : ZOOM_MIN;
			const hi = Number.isFinite(max) ? max : ZOOM_MAX;
			const v = Number(z);
			if (!Number.isFinite(v)) return lo;
			return Math.min(hi, Math.max(lo, v));
		}
		/**
		 * 图片缩放下限：统一下限是 25%，但大图「适应窗口」可能远小于 25%（6000px 宽图在窄栏里约 13%），
		 * 若硬钳到 25% 会让「适应窗口」永远达不到。故下限取 min(25%, 适应比例)（纯函数）。
		 */
		function imageZoomMin(fitScale) {
			const fit = Number(fitScale);
			return Math.min(ZOOM_MIN, Number.isFinite(fit) && fit > 0 ? fit : ZOOM_MIN);
		}
		/** 滚轮增量归一化：行模式（Firefox 一档 ≈ 3 行）/ 页模式折算成像素（纯函数）。 */
		function normalizeWheelDelta(deltaY, deltaMode) {
			const d = Number(deltaY);
			if (!Number.isFinite(d)) return 0;
			const m = Number(deltaMode);
			if (m === 1) return d * (100 / 3);   // 行模式：一档 = 3 行 = 100px
			if (m === 2) return d * 100;
			return d;
		}
		/** 滚轮增量 → 缩放倍数（纯函数）：上滚放大、下滚缩小；一档（归一化 100px）≈ 25%，与浏览器档距一致。 */
		function wheelZoomFactor(deltaY, deltaMode) {
			const d = Math.max(-ZOOM_WHEEL_MAX, Math.min(ZOOM_WHEEL_MAX, normalizeWheelDelta(deltaY, deltaMode)));
			if (d === 0) return 1;
			return Math.pow(ZOOM_BTN_STEP, -d / 100);
		}
		/** 工具条单步缩放：dir>0 放大（纯函数）。 */
		function stepZoom(cur, dir, min, max) {
			const f = dir > 0 ? ZOOM_BTN_STEP : 1 / ZOOM_BTN_STEP;
			return clampZoom(clampZoom(cur, min, max) * f, min, max);
		}
		/** 缩放后按比例换算视口中心，让原可视中心仍落在中心（图片用；纯函数）。 */
		function recenterScroll(start, viewSize, ratio) {
			const s = Number(start) || 0;
			const v = Number(viewSize) || 0;
			const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
			return Math.max(0, (s + v / 2) * r - v / 2);
		}
		/** 标签 → 缩放比例的会话内记忆（刷新页面即回 100%，不写 localStorage）。 */
		const TAB_ZOOM = new Map();
		function tabZoomOf(address) {
			const v = TAB_ZOOM.get(String(address));
			return Number.isFinite(v) ? clampZoom(v, ZOOM_MIN, ZOOM_MAX) : 1;
		}
		function setTabZoom(address, z) {
			TAB_ZOOM.set(String(address), clampZoom(z, ZOOM_MIN, ZOOM_MAX));
		}

		/**
		 * 图片缩放面板：适应窗口 / 实际大小 / 手动比例三态，Ctrl+滚轮、双击、拖拽平移。
		 * 比例由标签页持有（props.zoom 进、props.onZoom 出），只在本次会话内记忆。
		 */
		function VKImageZoomPane(props) {
			const wrapRef = react.useRef(null);
			const naturalRef = react.useRef({ w: 0, h: 0 });
			const fitRef = react.useRef(1);
			const scaleRef = react.useRef(Number.isFinite(props.zoom) ? props.zoom : 1);
			const modeRef = react.useRef("fit");
			const insideRef = react.useRef(false);
			const pendingRef = react.useRef(1);
			const dragRef = react.useRef(null);
			const [scale, setScale] = react.useState(scaleRef.current);
			const [mode, setMode] = react.useState("fit");
			const [fit, setFit] = react.useState(1);
			const [status, setStatus] = react.useState("loading");
			const [tooBig, setTooBig] = react.useState(null);
			const report = props.onZoom;
			/** 统一入口：比例与模式一起落，并回报给标签页。 */
			const apply = react.useCallback((next, nextMode) => {
				scaleRef.current = next;
				modeRef.current = nextMode;
				setScale(next);
				setMode(nextMode);
				if (typeof report === "function") report(next);
			}, [report]);
			/** 适应窗口比例：容器与原始尺寸取小、不超过 1（大图缩小到可见，小图不放大）。 */
			const measure = react.useCallback(() => {
				const wrap = wrapRef.current;
				const n = naturalRef.current;
				if (wrap === null || n.w <= 0 || n.h <= 0) return;
				const s = Math.min(1, (wrap.clientWidth || 1) / n.w, (wrap.clientHeight || 1) / n.h);
				fitRef.current = s;
				setFit(s);
				if (modeRef.current === "fit") apply(s, "fit");
			}, [apply]);
			react.useEffect(() => {
				const wrap = wrapRef.current;
				if (wrap === null || typeof ResizeObserver !== "function") return () => { };
				const ro = new ResizeObserver(() => measure());
				ro.observe(wrap);
				return () => ro.disconnect();
			}, [measure]);
			// 缩放后把原可视中心换算回中心，否则放大总是往右下跑
			react.useEffect(() => {
				const wrap = wrapRef.current;
				const r = pendingRef.current;
				if (wrap === null || r === 1) return;
				pendingRef.current = 1;
				wrap.scrollLeft = recenterScroll(wrap.scrollLeft, wrap.clientWidth, r);
				wrap.scrollTop = recenterScroll(wrap.scrollTop, wrap.clientHeight, r);
			}, [scale]);
			const zoomBy = react.useCallback((factor) => {
				if (naturalRef.current.w <= 0) return;
				const cur = scaleRef.current;
				const next = clampZoom(cur * factor, imageZoomMin(fitRef.current), ZOOM_MAX);
				if (next === cur) return;
				pendingRef.current = next / cur;
				apply(next, "manual");
			}, [apply]);
			const useFit = react.useCallback(() => apply(fitRef.current, "fit"), [apply]);
			const useActual = react.useCallback(() => apply(1, "manual"), [apply]);
			const onLoad = react.useCallback((e) => {
				const img = e.target;
				let w = img.naturalWidth || 0;
				let h = img.naturalHeight || 0;
				if (w <= 0 || h <= 0) {   // svg 等没有 natural 尺寸：退回首帧渲染尺寸
					const r = img.getBoundingClientRect();
					w = r.width || 1;
					h = r.height || 1;
				}
				naturalRef.current = { w, h };
				setStatus("ok");
				setTooBig(null);
				measure();
			}, [measure]);
			// <img> 的 onError 拿不到原因（413 的 JSON 体进不了 <img>）：失败后再探一次，只认 413
			const onError = react.useCallback(() => {
				setStatus("error");
				try {
					fetch(props.src, { headers: { Range: "bytes=0-0" } }).then((r) => {
						if (r.status !== 413) { try { if (r.body && typeof r.body.cancel === "function") r.body.cancel(); } catch { /* 无 body */ } return null; }
						return r.json()
							.then((d) => { setTooBig(d !== null && d !== undefined && typeof d.error === "string" ? d.error : "file too large"); })
							.catch(() => setTooBig("file too large"));
					}).catch(() => { /* 探测失败就保留通用提示 */ });
				} catch { /* 无 fetch：保留通用提示 */ }
			}, [props.src]);
			// 滚轮：按住 Ctrl/⌘ 才缩放，其余情况保持原义（滚动图片），绝不 preventDefault
			react.useEffect(() => {
				const wrap = wrapRef.current;
				if (wrap === null) return () => { };
				const onWheel = (e) => {
					if (!(e.ctrlKey || e.metaKey)) return;
					e.preventDefault();
					e.stopPropagation();
					const f = wheelZoomFactor(e.deltaY, e.deltaMode);
					if (f !== 1) zoomBy(f);
				};
				// Ctrl+0 复位 100%：只在指针位于图片区内时响应，不抢全局快捷键
				const onKey = (e) => {
					if (!(e.ctrlKey || e.metaKey) || (e.key !== "0" && e.code !== "Digit0")) return;
					if (!insideRef.current) return;
					e.preventDefault();
					useActual();
				};
				const enter = () => { insideRef.current = true; };
				const leave = () => { insideRef.current = false; };
				wrap.addEventListener("wheel", onWheel, { passive: false });
				wrap.addEventListener("mouseenter", enter);
				wrap.addEventListener("mouseleave", leave);
				window.addEventListener("keydown", onKey);
				return () => {
					wrap.removeEventListener("wheel", onWheel);
					wrap.removeEventListener("mouseenter", enter);
					wrap.removeEventListener("mouseleave", leave);
					window.removeEventListener("keydown", onKey);
				};
			}, [zoomBy, useActual]);
			// 拖拽平移：主键按下即抓手，指针移出容器也跟得住（pointer capture）
			const onPanDown = react.useCallback((e) => {
				if (e.button !== 0) return;
				const wrap = e.currentTarget;
				dragRef.current = { x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
				wrap.classList.add("vk_imgPan");
				try { wrap.setPointerCapture(e.pointerId); } catch { /* 环境不支持捕获 */ }
				const move = (ev) => {
					const d = dragRef.current;
					if (d === null) return;
					wrap.scrollLeft = d.left - (ev.clientX - d.x);
					wrap.scrollTop = d.top - (ev.clientY - d.y);
				};
				const stop = () => {
					dragRef.current = null;
					wrap.classList.remove("vk_imgPan");
					wrap.removeEventListener("pointermove", move);
					wrap.removeEventListener("pointerup", stop);
					wrap.removeEventListener("pointercancel", stop);
				};
				wrap.addEventListener("pointermove", move);
				wrap.addEventListener("pointerup", stop);
				wrap.addEventListener("pointercancel", stop);
			}, []);
			const onDblClick = react.useCallback(() => { if (modeRef.current === "fit") useActual(); else useFit(); }, [useActual, useFit]);
			const pct = Math.round(scale * 100);
			const imgStyle = status === "ok"
				? { width: Math.round(naturalRef.current.w * scale) + "px", height: Math.round(naturalRef.current.h * scale) + "px" }
				: { maxWidth: "100%", maxHeight: "100%" };
			return h("div", { className: "vk_imgPane", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
				h("div", { className: "vk_imgToolbar" },
					h("button", { type: "button", className: "vk_imgZoomBtn", title: "缩小（Ctrl+滚轮下滚同效）", onClick: () => zoomBy(1 / ZOOM_BTN_STEP) }, h(VIcon, { name: "zoomOut", size: 13 })),
					h("button", { type: "button", className: "vk_imgZoomBtn", title: "放大（Ctrl+滚轮上滚同效）", onClick: () => zoomBy(ZOOM_BTN_STEP) }, h(VIcon, { name: "zoomIn", size: 13 })),
					h("span", { className: "vk_imgZoomPct", title: "当前缩放比例（" + Math.round(ZOOM_MIN * 100) + "% ~ " + Math.round(ZOOM_MAX * 100) + "%，Ctrl+滚轮可调）" }, pct + "%"),
					h("span", { className: "vk_imgToolbarSpacer" }),
					h("button", { type: "button", className: "vk_imgZoomBtn" + (mode === "fit" ? " vk_imgZoomBtnOn" : ""), title: "适应窗口（双击图片同效）", onClick: useFit }, "适应窗口"),
					h("button", { type: "button", className: "vk_imgZoomBtn" + (Math.abs(scale - 1) < 1e-6 ? " vk_imgZoomBtnOn" : ""), title: "实际大小 100%（Ctrl+0 同效）", onClick: useActual }, "1:1")
				),
				h("div", {
					className: "vk_imgWrap",
					ref: wrapRef,
					onPointerDown: onPanDown,
					onDoubleClick: onDblClick,
					title: "Ctrl+滚轮缩放 · 滚轮/拖拽平移 · 双击切换适应/实际大小 · Ctrl+0 复位 100%"
				},
					status === "error"
						? h("div", { style: { margin: "auto", padding: "18px", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", textAlign: "center" } },
							h("div", { style: { fontSize: "13px", fontWeight: 600 } }, tooBig === null ? "图片加载失败" : "图片过大，面板内无法预览"),
							h("div", { style: { fontSize: "11.5px", lineHeight: "17px", color: "var(--dsw-alias-label-tertiary)" } },
								tooBig === null
									? "无法读取该地址"
									: ("host 预览上限 64MB（" + tooBig + "）。用「所在文件夹」调系统看图器打开，或「新窗口」交给浏览器（同样受该上限）。")),
							h("div", { style: { display: "flex", gap: "8px" } },
								h("button", { type: "button", className: "vk_pickBtn vk_primaryBtn", title: "在资源管理器中打开该文件所在的文件夹（不受 64MB 预览上限影响）", onClick: () => vkRevealInExplorer(vkImagePathOfSrc(props.src)) }, "所在文件夹"),
								h("button", { type: "button", className: "vk_pickBtn", title: "在新标签页打开原图地址", onClick: () => { try { window.open(props.src, "_blank"); } catch { /* 打不开就留着 */ } } }, "新窗口")))
						: h("img", {
							src: props.src,
							alt: props.alt === undefined ? "" : props.alt,
							style: imgStyle,
							draggable: false,
							onLoad: onLoad,
							onError: onError
						})
				)
			);
		}

		/** iframe 元素 + 地址 → 在 React 里挂载/卸载缩放（返回挂到 iframe 上的 ref）。 */
		function useFrameZoom(address) {
			const ref = react.useRef(null);
			react.useEffect(() => {
				const frame = ref.current;
				if (frame === null) return void 0;
				let off = () => {};
				const bind = () => {
					off();
					off = attachFrameZoom(frame, address);
				};
				bind();
				// 换 src / 重新加载后 document 是新的，监听要重装；跨源页也是加载完才判定得出来
				frame.addEventListener("load", bind);
				return () => {
					try { frame.removeEventListener("load", bind); } catch { /* ignore */ }
					off();
				};
			}, [address]);
			return ref;
		}

		function VKViewModeMenu({ label, title, items }) {
			const [open, setOpen] = react.useState(false);
			const boxRef = react.useRef(null);
			react.useEffect(() => {
				if (!open) return void 0;
				const onDown = (e) => {
					const box = boxRef.current;
					if (box !== null && box !== undefined && !box.contains(e.target)) setOpen(false);
				};
				const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
				document.addEventListener("mousedown", onDown, true);
				document.addEventListener("keydown", onKey, true);
				return () => {
					document.removeEventListener("mousedown", onDown, true);
					document.removeEventListener("keydown", onKey, true);
				};
			}, [open]);
			const list = Array.isArray(items) ? items : [];
			return h("div", { className: "vk_viewMode", ref: boxRef },
				h("button", {
					type: "button",
					className: "vk_viewModeBtn" + (open ? " vk_viewModeBtnOn" : ""),
					title: title !== undefined && title !== null ? title : label,
					"aria-label": "打开方式",
					"aria-haspopup": "menu",
					"aria-expanded": open ? "true" : "false",
					onClick: () => setOpen(!open)
				}, label, h(VIcon, { name: "chevronDown", size: 11 })),
				open
					? h("div", { className: "vk_viewMenu", role: "menu" },
						list.map((it, i) => (it === null
							? h("div", { key: "sep" + i, className: "vk_viewMenuSep" })
							: h("button", {
								key: it.key !== undefined && it.key !== null ? it.key : String(i),
								type: "button",
								role: "menuitem",
								className: "vk_viewMenuItem" + (it.on === true ? " vk_viewMenuItemOn" : ""),
								title: it.title !== undefined && it.title !== null ? it.title : it.label,
								onClick: () => { setOpen(false); if (typeof it.run === "function") it.run(); }
							}, h("span", { className: "vk_viewMenuLabel" }, it.label), it.on === true ? h("span", { className: "vk_viewMenuCheck" }, h(VIcon, { name: "check", size: 12 })) : null))))
					: null
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：右栏「查看器」Tab 的正文
		// ──────────────────────────────────────────────────────────────
		function VKViewerTabBody({ useTabInfo }) {
			const { tab } = useTabInfo();
			const navigation = tab.navigation;
			const address = navigation.address;
			const params = navigation.params !== undefined && navigation.params !== null ? navigation.params : {};
			const paramsUrl = params.url !== undefined && typeof params.url === "string" ? params.url : null;
			// 网页有两种进来方式：① 地址本身就是 http(s)（openResource 走不通，见下）；② 标签页类型路径
			// （`openTab`）把网址放在 params.url 里——官方 `placeResource` 只吃 `dsh-resource://` 前缀的地址，
			// http(s) 一律被前缀校验挡掉（实测确认不是 pattern 问题），所以自研的「粘贴网址即开」走的是 ②。
			const webUrl = vkIsWebAddress(address) ? address : (paramsUrl !== null && vkIsWebAddress(paramsUrl) ? paramsUrl : null);
			const web = webUrl !== null;
			// 网页 / 本地 html 的 iframe 缩放挂点（浏览器原生语义：iframe 元素 zoom；Ctrl+滚轮 / Ctrl+±/0；
			// 见 useFrameZoom 上面那段实测结论）。键用**真地址**（webUrl 或落盘地址），
			// 与标签一一对应，缩放比例按标签记忆。
			const frameRef = useFrameZoom(web ? webUrl : address);
			const filePath = web ? null : vkFilePathOfAddress(address);
			const targetPath = filePath !== null ? filePath : address;
			const targetExt = vkExtOfAddress(targetPath);
			const office = !web && VK_OFFICE_EXT.has(targetExt);
			// 音视频：走 host 的流式路由（支持 Range，<video> 才能拖进度；/vscode-files/file 是整块读+64MB 上限）
			const video = !web && VK_VIDEO_EXT.has(targetExt);
			const audio = !web && VK_AUDIO_EXT.has(targetExt);
			// 「用系统默认程序打开」：Office → 本机 Office；本地 html → 默认浏览器；http(s) 网页 → 默认浏览器。
			// 网页这一路是「把内嵌 iframe 里的这一页拿到真正的浏览器窗口里去」的出口（用户明确要）。
			const nativeOpenLabel = web ? "用浏览器打开" : vkNativeOpenLabel(targetExt);
			// Office 走两步：先问 host 的转换端点拿「视图入口 url」（/vscode-files/office 返回的是 JSON，直接塞进
			// iframe 只会显示一段 JSON——实测踩过），再把 iframe 指到那个入口。
			const [officeView, setOfficeView] = react.useState(() => (paramsUrl !== null ? { status: "ready", url: paramsUrl } : { status: "loading", url: null }));
			/** 音视频播放失败原因（浏览器解不了容器/编码时给出可执行的下一步）。 */
			const [mediaErr, setMediaErr] = react.useState(null);
			react.useEffect(() => {
				if (!office) return void 0;
				if (paramsUrl !== null) { setOfficeView({ status: "ready", url: paramsUrl }); return void 0; }
				let dead = false;
				setOfficeView({ status: "loading", url: null });
				const target = filePath !== null ? filePath : address;
				fetch("/vscode-files/office?path=" + encodeURIComponent(target))
					.then((r) => r.json())
					.then((d) => {
						if (dead) return;
						if (d !== null && d !== undefined && d.ok === true && typeof d.url === "string") setOfficeView({ status: "ready", url: d.url, note: typeof d.note === "string" ? d.note : null });
						else setOfficeView({ status: "error", url: null, note: d !== null && d !== undefined && typeof d.error === "string" ? d.error : "转换失败" });
					})
					.catch((e) => { if (!dead) setOfficeView({ status: "error", url: null, note: String(e && e.message ? e.message : e) }); });
				return () => { dead = true; };
			}, [office, address, filePath, paramsUrl]);
			const url = web
				? webUrl
				: office
					? (officeView.url !== null && officeView.url !== undefined ? officeView.url : null)
					: "/vscode-files/file?path=" + encodeURIComponent(filePath !== null ? filePath : address);
			// 图片：走自研缩放面板（同一标签类型内分支，地址语义与其它文件完全一样）
			if (!web && VK_IMAGE_EXT.has(vkExtOfAddress(address))) {
				return h("div", { className: "vk_viewerTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
					h("div", { className: "vk_viewerBar", style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "11.5px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "0.5px solid var(--dsw-alias-border-l3)", flex: "none" } },
						h(VIcon, { name: "image", size: 13 }),
						h("span", { title: vkDecodeAddress(address), style: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "图片 · " + vkViewTitle(address)),
						h(VKViewModeMenu, {
							label: "打开方式",
							title: "打开方式",
							items: [
								{
									key: "new-window",
									label: "新窗口",
									title: "在新标签页打开原图地址（用系统默认看图程序/浏览器打开）",
									run: () => {
										try {
											const target = filePath !== null ? filePath : address;
											window.open("/vscode-files/file?path=" + encodeURIComponent(target), "_blank");
										} catch { /* 打不开就留着 */ }
									}
								},
								{
									key: "reveal",
									label: "所在文件夹",
									title: "在资源管理器中打开该文件所在的文件夹（用系统看图器打开；不受 64MB 预览上限影响）",
									run: () => vkRevealInExplorer(filePath !== null ? filePath : address)
								}
							]
						})
					),
					h(VKImageZoomPane, {
						src: vkImageSrcOf(address, filePath),
						alt: vkViewTitle(address),
						zoom: tabZoomOf(address),
						onZoom: (z) => setTabZoom(address, z)
					})
				);
			}
			// 音视频：官方 viewer 没有这一类（落到 text 兜底只会说「非文本文件，暂时无法预览」）。
			// 走 host 的 /vscode-files/media —— 流式输出 + Range（<video> 没有 Range 就不能拖进度，
			// 而 /vscode-files/file 是整块读进内存、还有 64MB 上限）。
			if (video || audio) {
				const mediaSrc = "/vscode-files/media?path=" + encodeURIComponent(targetPath);
				return h("div", { className: "vk_viewerTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
					h("div", { className: "vk_viewerBar", style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "11.5px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "0.5px solid var(--dsw-alias-border-l3)", flex: "none" } },
						h(VIcon, { name: video ? "monitor" : "file", size: 13 }),
						h("span", { title: vkDecodeAddress(address), style: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (video ? "视频 · " : "音频 · ") + vkViewTitle(address)),
						h(VKViewModeMenu, {
							label: "打开方式",
							title: "打开方式",
							items: [
								{
									key: "new-window",
									label: "新窗口",
									title: "在新标签页打开流地址（交给浏览器自带播放器/下载）",
									run: () => { try { window.open(mediaSrc, "_blank"); } catch { /* 打不开就留着 */ } }
								},
								{
									key: "reveal",
									label: "所在文件夹",
									title: "在资源管理器中打开该文件所在的文件夹（用系统播放器打开）",
									run: () => vkRevealInExplorer(targetPath)
								}
							]
						})
					),
					h("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px", overflow: "auto" } },
						video
							? h("video", {
								src: mediaSrc,
								controls: true,
								preload: "metadata",
								style: { maxWidth: "100%", maxHeight: "100%", background: "#000", borderRadius: "8px" },
								onError: () => setMediaErr("浏览器无法播放该视频（容器/编码不支持；mkv、avi、rmvb 这类请用「所在文件夹」调系统播放器）")
							})
							: h("audio", {
								src: mediaSrc,
								controls: true,
								preload: "metadata",
								style: { width: "100%", maxWidth: "420px" },
								onError: () => setMediaErr("浏览器无法播放该音频（编码不支持；请用「所在文件夹」调系统播放器）")
							}),
						mediaErr !== null
							? h("div", { style: { fontSize: "11.5px", lineHeight: "17px", color: "var(--dsw-alias-label-tertiary)", textAlign: "center", maxWidth: "340px" } }, mediaErr)
							: null
					)
				);
			}
			// 「打开方式 / 显示方式」下拉的条目：按当前标签的实际能力拼（Office / 网页 / 本地 html 各不相同）。
			// Office 那两个是「显示方式」二选一（选中项打勾），其余是动作项；null 是分隔线。
			const officePdf = paramsUrl !== null && paramsUrl.indexOf("as=pdf") >= 0;
			const openOfficeView = (asPdf) => {
				try {
					const q = "/vscode-files/office?path=" + encodeURIComponent(targetPath) + (asPdf ? "&as=pdf" : "");
					tab.actions.openResource(address, { params: { url: q }, revealIfOpened: false });
				} catch { /* 打开失败时保留当前内容 */ }
			};
			const viewModeItems = [];
			if (office) {
				viewModeItems.push({
					key: "office-web", label: "网页视图", on: !officePdf,
					title: "本机 Office 转出来的网页视图（只读，首次转换较慢，结果会缓存）",
					run: () => openOfficeView(false)
				});
				viewModeItems.push({
					key: "office-pdf", label: "原版式（LibreOffice→PDF）", on: officePdf,
					title: "改用 LibreOffice 导出原版式 PDF",
					run: () => openOfficeView(true)
				});
				viewModeItems.push(null);
			}
			if (nativeOpenLabel !== null) {
				viewModeItems.push({
					key: "native", label: nativeOpenLabel,
					title: web
						? "用系统默认浏览器（Edge）打开这个网页"
						: VK_OFFICE_EXT.has(targetExt)
							? "用本机 Office（Word/Excel/PowerPoint）原生打开该文件"
							: "用系统默认浏览器打开这个本地网页",
					run: () => vkOpenNative(web ? webUrl : targetPath)
				});
			}
			if (!web) {
				viewModeItems.push({
					key: "reveal", label: "所在文件夹",
					title: "在资源管理器中打开该文件所在的文件夹",
					run: () => vkRevealInExplorer(targetPath)
				});
			}
			return h("div", { className: "vk_viewerTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
				h("div", { className: "vk_viewerBar", style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "11.5px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "0.5px solid var(--dsw-alias-border-l3)", flex: "none" } },
					h(VIcon, { name: web ? "monitor" : office ? "fileText" : "file", size: 13 }),
					h("span", { title: web ? webUrl : vkDecodeAddress(address), style: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, office ? "Office 转换预览 · " + vkViewTitle(address) : web ? webUrl : vkViewTitle(address)),
					h(VKViewModeMenu, {
						label: office ? "显示方式" : "打开方式",
						title: office ? "选择显示方式（网页视图 / 原版式），或用其它方式打开" : "打开方式",
						items: viewModeItems
					})
				),
				url !== null && url !== undefined
					? h("iframe", {
						key: url,
						ref: frameRef,
						className: "vk_viewerFrame",
						src: url,
						title: vkViewTitle(address),
						style: { flex: 1, minHeight: 0, width: "100%", border: 0, background: "var(--dsw-alias-bg-base)" }
					})
					: h("div", { className: "vk_empty", style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontSize: "12.5px", opacity: .85 } },
						office && officeView.status === "error"
							? "转换失败：" + String(officeView.note || "未知原因")
							: office ? "正在转换（首次转换较慢，结果会缓存）…" : "无可显示内容"
					)
			);
		}

		// ──────────────────────────────────────────────────────────────

		/** 当前会话 cwd（sessions 服务快照），相对路径地址要用它还原成磁盘路径。 */
		function vkCurrentSessionCwd() {
			try {
				const svc = ctxRef.current.get("sessions");
				const snap = svc.list.getSnapshot();
				const byId = snap !== undefined && snap !== null && snap.byId !== undefined && snap.byId !== null ? snap.byId : null;
				let row = null;
				if (byId !== null) {
					for (const key of Object.keys(byId)) {
						const candidate = byId[key];
						if (candidate !== null && candidate !== undefined && ((candidate.retainedBy && candidate.retainedBy.mainView) || 0) > 0) { row = candidate; break; }
					}
				}
				return row !== null && row.blank !== true && typeof row.cwd === "string" ? row.cwd : "";
			} catch { return ""; }
		}
		function apply(ctx) {
			ctxRef.current = ctx;
			// 右栏注册表可能比本插件晚就绪，轻量轮询等服务出现（旧实现同款）。
			let disposeType = null;
			let tries = 0;
			const attempt = () => {
				let registry;
				try { registry = ctx.get("sidebarRightTabs"); } catch { registry = undefined; }
				if (registry !== undefined && registry !== null && typeof registry.register === "function") {
					try { disposeType = registry.register(vkViewTabDefinition()); } catch { /* 已有注册就沿用 */ }
					return;
				}
				tries += 1;
				if (tries < 40) setTimeout(attempt, 500);
			};
			attempt();
			try {
				ctx.on("dispose", () => {
					if (typeof disposeType === "function") { try { disposeType(); } catch { /* ignore */ } }
				});
			} catch { /* ignore */ }
			vkCard(ctx, { slot: VK.rightbar.viewer, id: "viewer", order: 10, component: VKViewerTabBody });
		}

		exports.apply = apply;
		exports.inject = ["slots"];
		return module.exports;
	}
});
