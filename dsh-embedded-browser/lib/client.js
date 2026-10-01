// dsh-embedded-browser — 右栏内嵌浏览器（client 半）：一块 stage + 一行自绘导航栏（含标签条）。
// stage 只是占位矩形：真正的画面由 DSH 桌面外壳（dsh-desktop，WinForms + WebView2）主窗体里
// Controls.Add 的那几块 WebView2 原生控件（一块 = 一个标签页）画在上面，外壳按这里上报的
// getBoundingClientRect() 摆位，同一时刻只有当前标签那块可见。
// 导航 / 前进后退 / 重载停止 / 首页 / 缩放 / 开关标签 都经 chrome.webview.postMessage 交给外壳做；
// 外壳用 dsh-embed-state（含 tabs 列表）把地址/标题/可否前进后退/加载中/缩放/标签推回来。
// 收藏夹与历史走宿主 JSON 路由；收藏夹列表框要盖住画面，而原生控件永远在页面之上，
// 所以打开列表框时先让外壳把画面藏起来，关掉再报一次矩形让它回来（页面不重排）。
window.__ModuleLoader__.load({
	id: 'dsh-embedded-browser',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		const react = require('react');
		const h = react.createElement;

		const TAB_ID = 'dsh-embedded-browser/panel';
		const TAB_KIND = 'dsh-embedded-browser';
		const ROUTE = '/embedded-browser';
		const START_URL = 'https://limestart.cn/';
		const LEGACY_START_URL = 'https://cn.bing.com/';
		const STORE_KEY = 'dsh-embedded-browser/url';
		const REPORT_MS = 500;
		const MIN_SIZE = 40;
		// 遮挡检测：原生画面永远在主界面之上，DSH 里的 DOM 浮层压过来没法正确层叠，
		// 所以面板被非面板元素盖住哪怕一点，就把画面整块藏起来，浮层收起后再报矩形让它回来。
		const OCCL_MIN = 8;          // 覆盖边小于这个尺寸的（拖拽条 / 分隔线）不算遮挡
		const OCCL_THROTTLE = 120;   // 两次遮挡扫描的最小间隔（单次约 5ms）
		const OCCL_SETTLE_MS = 200;  // 画面还在动（拖右栏 / 收起展开）就不扫遮挡：扫描要遍历全文档，跟帧跑会把主线程占满
		const OCCL_SEEN_MAX = 200;   // 动态记住的"像浮层"节点上限
		const OCCL_SELECTOR = '[aria-modal],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[role="tooltip"],dialog,[class*="mask"],[class*="overlay"],[class*="modal"],[class*="dialog"],[class*="popup"],[class*="dropdown"],[class*="menu"],[class*="tooltip"],[class*="toast"],[class*="drawer"],[class*="sheet"]';
		// 只看选择器、不读 computedStyle 的预处理：MutationObserver 每条记录都调一次，
		// 必须零成本（流式输出每来一段字都在改节点的 class/style，读样式就会卡）。
		function matchesOccl(node) {
			if (node === null || node === undefined || node.nodeType !== 1) return false;
			try { return typeof node.matches === 'function' && node.matches(OCCL_SELECTOR) === true; } catch { return false; }
		}
		// 收藏夹浮层外形：一次显示 10 行，数值要和外壳浮层页面里的 .row / #card / #list 对上；
		// 卡片铺满控件（不透明底 + 圆角），所以高度 = 卡片上下描边 2 + 列表内边距 12 + 行数 × 行高
		const SHELF_ROWS = 10;
		const SHELF_ROW_H = 32;
		const SHELF_CHROME = 14;
		const SHELF_H = SHELF_CHROME + SHELF_ROWS * SHELF_ROW_H;
		// 收藏项的图标地址存在面板自己的 localStorage 里（url → 图标），不动 host 侧的存档格式
		const ICON_KEY = 'dsh-embedded-browser/icons';

		const ICONS = {
			back: '<path d="M15 18l-6-6 6-6"/>',
			forward: '<path d="M9 6l6 6-6 6"/>',
			reload: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 3.5V9H15"/>',
			stop: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
			home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
			plus: '<path d="M12 5.5v13"/><path d="M5.5 12h13"/>',
			star: '<path d="M12 3.6l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 10l6-.9z"/>',
			starFilled: '<path d="M12 3.6l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 10l6-.9z" fill="currentColor"/>',
			list: '<path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h16"/>',
			zoomOut: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M8 10.5h5"/><path d="M15.4 15.4L21 21"/>',
			zoomIn: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M8 10.5h5"/><path d="M10.5 8v5"/><path d="M15.4 15.4L21 21"/>',
			globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
			open: '<path d="M13.5 4.5h6v6"/><path d="M19.5 4.5L11.5 12.5"/><path d="M17.5 14v5.6h-13V6.6H10"/>',
			folder: '<path d="M3 6.8h5.2l1.6 2.1H21v9.3H3z"/>',
			warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.4v.2"/>'
		};

		function Icon(props) {
			const size = props.size === undefined || props.size === null ? 15 : props.size;
			return h('svg', {
				width: size,
				height: size,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.8,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true',
				dangerouslySetInnerHTML: { __html: ICONS[props.name] === undefined ? '' : ICONS[props.name] }
			});
		}

		const CSS = [
			'body{--vk-accent:var(--dsw-alias-accent,var(--dsw-alias-state-business-primary));--vk-accent-ring:color-mix(in srgb,var(--vk-accent) 22%,transparent);--vk-accent-soft:color-mix(in srgb,var(--vk-accent) 12%,transparent);--vk-ok:#73c991;--vk-danger:var(--dsw-alias-state-error-primary,#f14c4c);--vk-danger-soft:color-mix(in srgb,var(--vk-danger) 35%,transparent);--vk-fg:var(--dsw-alias-label-primary);--vk-fg2:var(--dsw-alias-label-secondary);--vk-fg3:var(--dsw-alias-label-tertiary);--vk-line:var(--dsw-alias-border-l1);--vk-line2:var(--dsw-alias-border-l2);--vk-bg-hover:var(--dsw-alias-interactive-bg-hover);--vk-r-xs:4px;--vk-r-sm:6px;--vk-r-md:8px;--vk-r-lg:12px;--vk-r-pill:999px;--vk-fs-xs:11px;--vk-fs-sm:12px;--vk-fs-md:13px;--vk-fs-lg:14px;--vk-dur:.12s;--vk-ease:cubic-bezier(.2,.7,.3,1);--vk-fade:background-color var(--vk-dur) var(--vk-ease),color var(--vk-dur) var(--vk-ease),border-color var(--vk-dur) var(--vk-ease),opacity var(--vk-dur) var(--vk-ease);--vk-ring:0 0 0 2px var(--vk-accent-ring);}',
			'.eb_root{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-specific-sidebar-fill)}',
			'.eb_bar{display:flex;align-items:center;gap:2px;height:38px;box-sizing:border-box;padding:0 6px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:0 0 auto}',
			'.eb_btn{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;border-radius:var(--vk-r-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0}',
			'.eb_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.eb_btn:disabled{opacity:.35;cursor:default}',
			'.eb_btn[data-on="1"]{color:var(--dsw-alias-brand-primary)}',
			// 标签条：滑条槽位常驻（overflow-x:scroll + 固定高 26 = 21 标签 + 5 滑条），
			// 滑条出现/消失就不会把标签顶来顶去；槽位平时透明，鼠标移到标签条上才显形。
			// 别写标准的 scrollbar-width/scrollbar-color：一写 Chromium 就忽略 ::-webkit-scrollbar，
			// 滑条厚度由不得我们，内容区被压到 21px 以下就会裁标签。
			'.eb_tabs{display:flex;align-items:center;gap:3px;flex:0 1 auto;min-width:0;max-width:42%;height:26px;overflow-x:scroll;overflow-y:hidden;margin:0 3px}',
			'.eb_tabs::-webkit-scrollbar{height:5px}',
			'.eb_tabs::-webkit-scrollbar-track{background:transparent}',
			'.eb_tabs::-webkit-scrollbar-thumb{background:transparent;border-radius:3px}',
			'.eb_tabs:hover::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l3)}',
			'.eb_tabs::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-tertiary)}',
			'.eb_tabs::-webkit-scrollbar-button{display:none}',
			'.eb_tab{display:flex;align-items:center;gap:3px;flex:0 1 auto;min-width:46px;height:21px;max-width:124px;padding:0 3px 0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--vk-r-sm);background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-secondary);font-size:var(--vk-fs-xs);cursor:pointer;transition:var(--vk-fade)}',
			'.eb_tab:hover{border-color:var(--dsw-alias-border-l3)}',
			// 当前页面这一页：常规高亮 + 品牌色描边，扫一眼就知道人在哪
			'.eb_tab[data-active="1"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}',
			'.eb_tabText{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			// 关闭叉常占位（不占位的话 hover 一显形标签就会跳宽），悬停这个标签、或它自己是当前页时才露出来
			'.eb_tabClose{display:flex;flex:0 0 auto;align-items:center;justify-content:center;width:15px;height:15px;opacity:0;border-radius:var(--vk-r-xs);transition:opacity var(--vk-dur) var(--vk-ease),background-color var(--vk-dur) var(--vk-ease)}',
			'.eb_tab:hover .eb_tabClose,.eb_tab[data-active="1"] .eb_tabClose{opacity:.6}',
			'.eb_tab .eb_tabClose:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover)}',
			'.eb_tab .eb_tabSpin{opacity:.9}',
			'.eb_url{flex:1 1 auto;min-width:90px;height:24px;margin:0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--vk-r-sm);background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);font-size:var(--vk-fs-sm);padding:0 8px;outline:none}',
			'.eb_url:focus{border-color:var(--dsw-alias-border-l3)}',
			'.eb_shelf{position:absolute;top:6px;right:6px;width:300px;max-width:calc(100% - 12px);max-height:calc(100% - 12px);z-index:5;display:flex;flex-direction:column;background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--vk-r-md);box-shadow:0 14px 34px rgba(0,0,0,.45);overflow:hidden}',
			'.eb_shelfList{flex:1 1 auto;min-height:0;overflow:auto;padding:4px 0}',
			'.eb_mark{display:flex;align-items:center;gap:8px;padding:6px 10px;font-size:var(--vk-fs-sm);color:var(--dsw-alias-label-secondary);cursor:pointer}',
			'.eb_mark:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.eb_fav{flex:0 0 auto;width:16px;height:16px;border-radius:3px;object-fit:contain}',
			'.eb_markText{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.eb_del{flex:0 0 auto;display:flex;opacity:.55}',
			'.eb_del:hover{opacity:1}',
			'.eb_empty{padding:8px;font-size:var(--vk-fs-sm);color:var(--dsw-alias-label-tertiary)}',
			'.eb_stage{position:relative;flex:1 1 auto;min-height:0}',
			'.eb_barWrap{position:relative;flex:0 0 auto}',
			'.eb_prog{position:absolute;left:0;right:0;bottom:0;height:2px;overflow:hidden;pointer-events:none}',
			'.eb_progBar{position:absolute;top:0;bottom:0;width:35%;border-radius:2px;background:var(--dsw-alias-brand-primary);animation:eb_progSlide 1.15s cubic-bezier(.62,.04,.35,1) infinite}',
			'@keyframes eb_progSlide{0%{left:-35%}100%{left:100%}}',
			// 窄栏：面板挤到放不下整条工具栏时，收起缩放的条件下再压地址框与标签条（不藏功能，只压宽度）
			'.eb_root[data-compact="2"] .eb_url{min-width:56px}',
			'.eb_root[data-compact="2"] .eb_tabs{max-width:26%}',
			'@keyframes eb_spin{to{transform:rotate(360deg)}}',
			'.eb_tabSpin svg{animation:eb_spin .9s linear infinite}',
			// 一个标签都不剩时的空态：面板不会停在没画面的空处，中间放个能点的「新标签页」
			'.eb_new{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:56px;height:56px;box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);border-radius:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:color .15s ease,border-color .15s ease,background .15s ease}',
			'.eb_new:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover)}',
			// 下载条：一条一项，文件名 + 细进度 + 百分比 + 动作，和 Edge 那条一个意思
			'.eb_dl{flex:0 0 auto;display:flex;flex-direction:column;max-height:132px;overflow:auto;padding:2px 6px 4px;border-bottom:1px solid var(--dsw-alias-border-l2)}',
			'.eb_dlRow{display:flex;align-items:center;gap:7px;height:24px;flex:0 0 auto;font-size:var(--vk-fs-sm)}',
			'.eb_dlName{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
			'.eb_dlBar{flex:0 0 auto;width:72px;height:4px;border-radius:2px;background:var(--dsw-alias-border-l2);overflow:hidden}',
			'.eb_dlFill{display:block;height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary);transition:width .2s linear}',
			'.eb_dlFill[data-state="done"],.eb_dlFill[data-state="fail"]{background:var(--dsw-alias-label-tertiary)}',
			'.eb_dlPct{flex:0 0 auto;min-width:46px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
			'.eb_dlAct{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:var(--vk-r-xs);color:var(--dsw-alias-label-tertiary);cursor:pointer}',
			'.eb_dlAct:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}',
			'.eb_fail{position:absolute;left:0;right:0;top:38%;display:flex;justify-content:center;color:var(--dsw-alias-label-tertiary)}'
		].join('');

		function injectCss() {
			if (typeof document === 'undefined') return;
			for (const old of document.querySelectorAll('style[data-plugin="dsh-embedded-browser"]')) {
				try { old.remove(); } catch { }
			}
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-embedded-browser';
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		injectCss();

		function bridge() {
			try {
				const wv = typeof window === 'undefined' || window.chrome === undefined ? undefined : window.chrome.webview;
				return wv !== undefined && wv !== null && typeof wv.postMessage === 'function' ? wv : null;
			} catch {
				return null;
			}
		}

		function normalizeUrl(input) {
			const text = String(input === undefined || input === null ? '' : input).trim();
			if (text.length === 0) return '';
			if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /^about:|^data:|^file:/i.test(text)) return text;
			if (/^localhost(:\d+)?(\/|$)/i.test(text) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(text)) return 'http://' + text;
			return 'https://' + text;
		}

		// 下载条上「还不知道总大小」时显示已下载的量
		function fmtBytes(n) {
			const v = Number(n);
			if (!(v > 0)) return '0 B';
			if (v < 1024) return v + ' B';
			if (v < 1024 * 1024) return (v / 1024).toFixed(0) + ' KB';
			if (v < 1024 * 1024 * 1024) return (v / 1024 / 1024).toFixed(1) + ' MB';
			return (v / 1024 / 1024 / 1024).toFixed(2) + ' GB';
		}

		// 元素自身是否画出东西：纯透明外壳（布局 wrapper）不算遮挡，只有真的上色/贴图/背景模糊才算
		function paints(node) {
			let cs;
			try { cs = window.getComputedStyle(node); } catch { return false; }
			if (cs === null || cs === undefined) return false;
			if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
			if (Number(cs.opacity) === 0) return false;
			// 拖拽条 / 分隔条：光标是 resize/grab 的不算遮挡，否则右栏一悬停画面就被藏起来
			if (/resize|grab|move/.test(cs.cursor === undefined ? '' : cs.cursor)) return false;
			const bg = cs.backgroundColor === undefined ? '' : cs.backgroundColor;
			const m = /rgba?\(([^)]+)\)/.exec(bg);
			if (m !== null) {
				const parts = m[1].split(',');
				const alpha = parts.length > 3 ? Number(parts[3]) : 1;
				if (alpha > 0.02) return true;
			}
			if (cs.backgroundImage !== undefined && cs.backgroundImage !== 'none') return true;
			const bf = cs.backdropFilter !== undefined && cs.backdropFilter !== 'none' ? cs.backdropFilter : (cs.webkitBackdropFilter === undefined ? 'none' : cs.webkitBackdropFilter);
			if (bf !== 'none') return true;
			return false;
		}

		// 候选是不是画在面板之上：在两者交集中间点一下，先碰到面板那层就说明候选在下面
		function abovePanel(panel, el, x, y) {
			let stack = [];
			try { stack = document.elementsFromPoint(x, y) || []; } catch { return false; }
			for (let i = 0; i < stack.length; i++) {
				const n = stack[i];
				if (n === panel || panel.contains(n) || n.contains(panel)) return false;
				if (n === el || el.contains(n) || n.contains(el)) return true;
			}
			return false;
		}

		// 面板是否被盖住：只看"像浮层"的元素（角色 / 类名筛选，外加动态出现过的节点），逐个求交再点一次确认，
		// 比逐点扫描整块面板快两个数量级；覆盖边小于 OCCL_MIN 的（拖拽条 / 分隔线）不算
		function occludedAt(stage, panel, seen) {
			const s = stage.getBoundingClientRect();
			if (s.width < MIN_SIZE || s.height < MIN_SIZE) return false;
			let list = [];
			try { list = Array.prototype.slice.call(document.querySelectorAll(OCCL_SELECTOR)); } catch { list = []; }
			if (Array.isArray(seen)) {
				for (let k = 0; k < seen.length; k++) if (list.indexOf(seen[k]) < 0) list.push(seen[k]);
			}
			for (let i = 0; i < list.length; i++) {
				const el = list[i];
				if (el === null || el === undefined || el.isConnected === false) continue;
				if (el === panel || panel.contains(el) || el.contains(panel)) continue;
				if (!paints(el)) continue;
				const r = el.getBoundingClientRect();
				const w = Math.min(r.right, s.right) - Math.max(r.left, s.left);
				const h = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
				if (w < OCCL_MIN || h < OCCL_MIN) continue;
				if (abovePanel(panel, el, Math.max(r.left, s.left) + w / 2, Math.max(r.top, s.top) + h / 2)) return true;
			}
			return false;
		}

		function readStore() {
			try { return String(window.sessionStorage.getItem(STORE_KEY) || ''); } catch { return ''; }
		}

		function writeStore(value) {
			try { window.sessionStorage.setItem(STORE_KEY, value); } catch { }
		}

		async function api(path, body) {
			const options = { cache: 'no-store', method: body === undefined ? 'GET' : 'POST' };
			if (body !== undefined) {
				options.headers = { 'content-type': 'application/json' };
				options.body = JSON.stringify(body);
			}
			const response = await fetch(ROUTE + path, options);
			const data = await response.json().catch(() => null);
			if (data === null) throw new Error('bad response');
			return data;
		}

		function BrowserPanel() {
			const [url, setUrl] = react.useState(readStore);
			const [page, setPage] = react.useState({ url: '', title: '', canGoBack: false, canGoForward: false, loading: false, zoom: 0.8, tabs: [] });
			const [draft, setDraft] = react.useState('');
			const [editing, setEditing] = react.useState(false);
			const [marks, setMarks] = react.useState([]);
			const [shelf, setShelf] = react.useState(false);
			// 外壳认不认 cmd:shelf（认 = 用外壳那块浮层；不认 = 退回面板里的小卡片）
			const [shellShelf, setShellShelf] = react.useState(false);
			// 0 宽 / 1 收起缩放 / 2 再压地址框与标签条：按工具条真实宽度算
			const [compact, setCompact] = react.useState(0);
			const [downloads, setDownloads] = react.useState([]);
			// 外壳报过「一个标签都不剩」才显示空态，免得刚挂上还没收到状态就闪一下
			const [tabsEmpty, setTabsEmpty] = react.useState(false);
			// 关掉最后一个标签后外壳会立刻补一个首页（几百毫秒），空态晚一点再露面就不会闪
			const [emptyVisible, setEmptyVisible] = react.useState(false);
			const stageRef = react.useRef(null);
			const barRef = react.useRef(null);
			const tabsRef = react.useRef(null);
			const urlInputRef = react.useRef(null);
			const lastTickRef = react.useRef(0);
			const timerRef = react.useRef(0);
			const urlRef = react.useRef(url);
			const targetRef = react.useRef('');
			const sentRef = react.useRef('');
			const lastRef = react.useRef('');
			const visibleRef = react.useRef(true);
			const shelfRef = react.useRef(false);
			const shellShelfRef = react.useRef(false);
			const occlRef = react.useRef(false);
			const occlAtRef = react.useRef(0);
			const occlSeenRef = react.useRef([]);
			const loggedRef = react.useRef('');
			const iconWaiterRef = react.useRef(null);
			const openRef = react.useRef(null);
			const supported = bridge() !== null;

			urlRef.current = url;

			// 工具条宽度决定紧凑档：窄到放不下整条工具栏时，先收缩放，再压地址框与标签条
			react.useEffect(() => {
				const bar = barRef.current;
				if (bar === null || typeof ResizeObserver === 'undefined') return undefined;
				const apply = () => {
					const w = bar.clientWidth || 0;
					const next = w < 300 ? 2 : (w < 430 ? 1 : 0);
					setCompact((old) => (old === next ? old : next));
				};
				apply();
				let observer = null;
				try { observer = new ResizeObserver(apply); observer.observe(bar); } catch { observer = null; }
				return () => { if (observer !== null) observer.disconnect(); };
			}, []);

			const post = (payload) => {
				const b = bridge();
				if (b === null) return;
				try { b.postMessage(Object.assign({ kind: 'dsh-embed' }, payload)); } catch { }
			};

			react.useEffect(() => {
				if (!tabsEmpty) { setEmptyVisible(false); return undefined; }
				const id = setTimeout(() => setEmptyVisible(true), 260);
				return () => clearTimeout(id);
			}, [tabsEmpty]);

			const nav = (action) => { post({ cmd: 'nav', action }); };

			/* 右栏展开 / 收起 / 全屏 / 缩放都是带动画的：DOM 每帧都在变，而原生画面要经
			   postMessage → 外壳 → SetWindowPos 才动，天然慢一到两帧，看起来就是「跟不上右栏」。
			   这里按最近一帧的速度往前推 LEAD_MS 补掉这段延迟：画面走在 DOM 稍前一点；
			   动画停下时速度≈0，补的量自然归零，不会一直偏。推进量封顶，免得快动画时甩出去。 */
			const LEAD_MS = 18;
			const LEAD_MAX_PX = 14;
			const leadRef = react.useRef({ t: 0, x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0 });

			const leadBy = (value, velocity) => {
				const px = velocity * LEAD_MS;
				if (px > LEAD_MAX_PX) return value + LEAD_MAX_PX;
				if (px < -LEAD_MAX_PX) return value - LEAD_MAX_PX;
				return value + px;
			};

			const geometry = () => {
				const stage = stageRef.current;
				if (stage === null) return null;
				const rect = stage.getBoundingClientRect();
				if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return null;
				const now = Date.now();
				const lead = leadRef.current;
				const dt = now - lead.t;
				if (dt >= 8) {
					lead.vx = (rect.left - lead.x) / dt;
					lead.vy = (rect.top - lead.y) / dt;
					lead.vw = (rect.width - lead.w) / dt;
					lead.vh = (rect.height - lead.h) / dt;
					lead.t = now;
					lead.x = rect.left;
					lead.y = rect.top;
					lead.w = rect.width;
					lead.h = rect.height;
				}
				return {
					x: Math.round(leadBy(rect.left, lead.vx)),
					y: Math.round(leadBy(rect.top, lead.vy)),
					w: Math.round(Math.max(MIN_SIZE, leadBy(rect.width, lead.vw))),
					h: Math.round(Math.max(MIN_SIZE, leadBy(rect.height, lead.vh))),
					dpr: window.devicePixelRatio || 1,
					vw: window.innerWidth || 0,
					vh: window.innerHeight || 0
				};
			};

			// 遮挡扫描带节流：被盖住哪怕一点就把画面藏起来（原生控件压不住 DOM 浮层），浮层收起后再报矩形让它回来
			const refreshOcclusion = react.useCallback(() => {
				const stage = stageRef.current;
				if (stage === null) { occlRef.current = false; return; }
				if (document.visibilityState === 'hidden') return;
				// 面板不在视口里就不用扫：结果没人用（report 里画面本来就是按 visibleRef 藏的）
				if (visibleRef.current === false) { occlRef.current = false; return; }
				// 画面还在动（拖右栏 / 收起展开）：扫描要 querySelectorAll 全文档 + 逐个命中测试，
				// 跟帧跑就是「拖着卡」的主因。停手后由 800ms 心跳 / mutation 补扫一次即可。
				if (Date.now() - lastTickRef.current < OCCL_SETTLE_MS) return;
				const now = Date.now();
				if (now - occlAtRef.current < OCCL_THROTTLE) return;
				const panel = typeof stage.closest === 'function' ? (stage.closest('.eb_root') || stage.parentElement) : stage.parentElement;
				occlRef.current = panel === null || panel === undefined ? false : occludedAt(stage, panel, occlSeenRef.current);
				occlAtRef.current = Date.now();
			}, []);

			const report = react.useCallback((force) => {
				if (!supported) return;
				const box = geometry();
				if (box !== null) refreshOcclusion();
				// 浮层开着：面板每次报矩形都顺手把它的位置带上，拖右栏时浮层跟着走
				if (shelfRef.current === true && shellShelfRef.current && box !== null) post(Object.assign({ cmd: 'shelf', show: true, panelH: SHELF_H }, box));
				const target = targetRef.current;
				const hidden = box === null
					|| occlRef.current === true
					|| visibleRef.current === false
					|| document.visibilityState === 'hidden'
					// 外壳不认 cmd:shelf 时，收藏夹还是面板里的 DOM 小卡片：画面必须让位，否则卡片被原生控件盖住（看着像"点了没反应"）
					|| (shelfRef.current === true && shellShelfRef.current !== true);
				let payload;
				if (hidden || target.length === 0) payload = { cmd: 'hide' };
				else if (sentRef.current !== target) payload = Object.assign({ cmd: 'open', url: target }, box);
				else payload = Object.assign({ cmd: 'rect' }, box);
				const key = JSON.stringify(payload);
				if (force !== true && key === lastRef.current) return;
				lastRef.current = key;
				if (payload.cmd === 'open') sentRef.current = target;
				post(payload);
			}, [supported, refreshOcclusion]);

			const open = (raw) => {
				const text = String(raw === undefined ? urlRef.current : raw).trim();
				if (text.length === 0) return;
				const target = normalizeUrl(text);
				if (target.length === 0) return;
				if (target === targetRef.current) { report(true); return; }
				targetRef.current = target;
				lastRef.current = '';
				writeStore(target);
				report(true);
			};

			// 跨插件入口：面板挂载期间留一个全局把手 + 一个 window 事件，别的插件拿到就能让这只浏览器导航
			// （面板不在右栏时把手不存在，调用方据此走不弹悬浮窗的降级）。
			react.useEffect(() => { openRef.current = open; });
			react.useEffect(() => {
				const call = (target) => { const fn = openRef.current; if (typeof fn === 'function') fn(target); };
				globalThis.__DSH_EMBED_OPEN__ = call;
				/* 别的插件在这只面板挂上之前点过链接：它把待办留在 __DSH_EMBED_PENDING__ 上，
				   这里挂好把手后立刻取走（免去调用方盲等几秒再降级到官方浏览器页）。 */
				const pending = globalThis.__DSH_EMBED_PENDING__;
				if (typeof pending === 'string' && pending.length > 0) {
					try { delete globalThis.__DSH_EMBED_PENDING__; } catch { globalThis.__DSH_EMBED_PENDING__ = undefined; }
					call(pending);
				}
				const onEvent = (event) => {
					const target = event === null || event === undefined ? undefined : event.detail;
					if (typeof target === 'string' && target.length > 0) call(target);
				};
				window.addEventListener('dsh-embed-open', onEvent);
				return () => {
					if (globalThis.__DSH_EMBED_OPEN__ === call) { try { delete globalThis.__DSH_EMBED_OPEN__; } catch { globalThis.__DSH_EMBED_OPEN__ = undefined; } }
					window.removeEventListener('dsh-embed-open', onEvent);
				};
			}, []);

			const hostOf = (target) => {
				try { return new URL(String(target)).hostname.replace(/^www\./, ''); } catch { return String(target === undefined || target === null ? '' : target); }
			};

			const favicon = (target) => {
				try { return new URL('/favicon.ico', target).href; } catch { return ''; }
			};

			const iconCache = () => {
				try { return JSON.parse(window.localStorage.getItem(ICON_KEY) || '{}') || {}; } catch { return {}; }
			};

			const rememberIcon = (target, icon) => {
				if (!target || !icon) return;
				try {
					const map = iconCache();
					map[target] = icon;
					window.localStorage.setItem(ICON_KEY, JSON.stringify(map));
				} catch { }
			};

			// 收藏时向外壳要一次当前页的真实图标地址：页面里 link[rel*=icon] 那个才准，
			// 猜 /favicon.ico 经常 404/403（站点把图标放在 CDN 上）
			const askIcon = () => new Promise((done) => {
				if (!supported) { done(''); return; }
				let waiter = null;
				const timer = setTimeout(() => {
					if (iconWaiterRef.current === waiter) iconWaiterRef.current = null;
					done('');
				}, 1500);
				waiter = (icon) => { clearTimeout(timer); iconWaiterRef.current = null; done(String(icon || '')); };
				iconWaiterRef.current = waiter;
				post({ cmd: 'icon' });
			});

			const markIcon = (item) => {
				const cached = iconCache()[item.url];
				return typeof cached === 'string' && cached.length > 0 ? cached : favicon(item.url);
			};

			// 名字优先用页面标题；标题缺失（外壳推得晚 / 老数据没存）就退到域名，别把整串网址摊出来
			const markTitle = (item) => {
				const text = String(item.title === undefined || item.title === null ? '' : item.title).trim();
				return text.length > 0 ? text : hostOf(item.url);
			};

			const shelfItems = (list) => {
				const src = Array.isArray(list) ? list : marks;
				return src.map((item) => ({ url: item.url, title: markTitle(item), icon: markIcon(item) }));
			};

			// 收藏夹交给外壳那块小 WebView2 画：它叠在画面上，画面不再让位（DOM 浮层永远被原生控件盖住）。
			const pushShelf = (list) => {
				const box = geometry();
				if (box === null) return false;
				post(Object.assign({ cmd: 'shelf', show: true, items: shelfItems(list), panelH: SHELF_H }, box));
				return true;
			};

			const openShelf = (on) => {
				const next = on === true;
				const was = shelfRef.current;
				shelfRef.current = next;
				setShelf(next);
				if (!supported) { report(true); return; }
				if (!next) {
					if (was) post({ cmd: 'shelf', show: false });
					report(true);
					return;
				}
				if (!shellShelfRef.current) { report(true); return; }
				if (!pushShelf(marks)) post({ cmd: 'shelf', show: false });
				report(true);
			};

			react.useEffect(() => {
				if (!supported) return undefined;
				const wv = bridge();
				const onMessage = (event) => {
					const data = event === null || event === undefined ? null : event.data;
					if (data === null || typeof data !== 'object') return;
					if (data.kind === 'dsh-embed-icon') {
						const waiter = iconWaiterRef.current;
						if (typeof waiter === 'function') waiter(data.icon || '');
						return;
					}
					if (data.kind === 'dsh-embed-focusurl') {
						const node = urlInputRef.current;
						if (node !== null) { try { node.focus(); node.select(); } catch { } }
						return;
					}
					if (data.kind === 'dsh-embed-shelf') {
						if (data.ack === true) { shellShelfRef.current = true; setShellShelf(true); return; }
						if (typeof data.url === 'string' && data.url.length > 0) { openShelf(false); open(data.url); }
						else if (data.closed === true) { shelfRef.current = false; setShelf(false); }
						return;
					}
					if (data.kind === 'dsh-embed-download') {
						setDownloads(Array.isArray(data.items) ? data.items : []);
						return;
					}
					if (data.kind !== 'dsh-embed-state') return;
					setPage((old) => Object.assign({}, old, data, { tabs: Array.isArray(data.tabs) ? data.tabs : old.tabs }));
					// 标签关到零个由外壳立刻补一个首页（关到零就白屏，补的速度还得看它）；
					// 这里只在真收到「零个」时把空态放出来，兜住外壳那边没补上的情况。
					if (Array.isArray(data.tabs)) setTabsEmpty(data.tabs.length === 0);
					if (typeof data.url === 'string' && data.url.length > 0) setUrl(data.url);
					if (data.loading === false && typeof data.url === 'string' && data.url.length > 0 && data.url !== loggedRef.current) {
						loggedRef.current = data.url;
						void api('/history', { url: data.url, title: data.title }).catch(() => {});
					}
				};
				if (wv !== null && typeof wv.addEventListener === 'function') wv.addEventListener('message', onMessage);
				return () => {
					if (wv !== null && typeof wv.removeEventListener === 'function') {
						try { wv.removeEventListener('message', onMessage); } catch { }
					}
				};
			}, [supported]);

			react.useEffect(() => {
				if (!supported) return undefined;
				post({ cmd: 'shelf', show: false, probe: true });
				return undefined;
			}, [supported]);

			react.useEffect(() => {
				if (!supported) return undefined;
				const stage = stageRef.current;
				let handle = 0;
				let observer = null;
				let visibleObserver = null;
				let domObserver = null;
				/* 右栏展开 / 收起 / 全屏 / 缩放走的是 transform 动画（实测 _tabCell_ transition: transform .3s
				   cubic-bezier(.4,0,.2,1)）。transform **不改布局尺寸、也不发 scroll/resize/mutation**，
				   ResizeObserver 与 DOM 观察器全都听不到。
				   所以面板挂上就常驻逐帧观察：动过的帧每帧量一次；静下来（连续 IDLE_SKIP 帧没变）
				   降到 IDLE_SKIP 帧量一次（约 15Hz，空闲开销可忽略）。一旦量到变化立刻回到每帧。
				   之前只在「交互后跑 1.5s」，动画尾巴、程序化开合、别的插件改布局全都会漏。 */
				const IDLE_SKIP = 4;
				let watchRaf = 0;
				let watchKey = '';
				let watchStill = 0;
				let watchFrames = 0;
				const watchFrame = () => {
					try { watchRaf = window.requestAnimationFrame(watchFrame); } catch { watchRaf = 0; }
					const node = stageRef.current;
					if (node === null || document.visibilityState === 'hidden') return;
					watchFrames += 1;
					if (watchStill >= IDLE_SKIP && (watchFrames % IDLE_SKIP) !== 0) return;
					const box = node.getBoundingClientRect();
					const key = Math.round(box.left) + ',' + Math.round(box.top) + ',' + Math.round(box.width) + ',' + Math.round(box.height);
					if (key === watchKey) {
						if (watchStill < IDLE_SKIP) watchStill += 1;
						return;
					}
					watchKey = key;
					watchStill = 0;
					lastTickRef.current = Date.now();
					report(false);
				};
				if (stage !== null) {
					try { watchRaf = window.requestAnimationFrame(watchFrame); } catch { watchRaf = 0; }
				}
				/* 跟手：一帧最多报一次（rAF 合并）。拖右栏时面板每帧都在动，按固定 30ms 节流会让
				   原生画面比面板慢半拍；这里同时把「最近一次运动时刻」记进 lastTickRef，
				   遮挡扫描据此在运动期间让路（见 refreshOcclusion）。 */
				const onChange = () => {
					lastTickRef.current = Date.now();
					watchStill = 0;
					if (timerRef.current !== 0) return;
					const run = () => { timerRef.current = 0; report(false); };
					let id = -1;
					try { id = window.requestAnimationFrame(run); } catch { id = -1; }
					if (id < 0) { run(); return; }
					timerRef.current = id;
				};
				/** 滚动只认「滚的是装着本面板的容器」：聊天流自己滚（流式输出每来一段就滚一次）
				    与画面摆位无关，跟着响应就是每滚一下都 postMessage 一次、外壳重摆原生控件。 */
				const onScroll = (event) => {
					const target = event === null || event === undefined ? null : event.target;
					if (target !== null && target !== document && target.nodeType === 1) {
						if (stage === null) return;
						if (target !== stage && target.contains(stage) !== true) return;
					}
					onChange();
				};
				if (stage !== null && typeof ResizeObserver !== 'undefined') {
					observer = new ResizeObserver(onChange);
					observer.observe(stage);
				}
				if (stage !== null && typeof IntersectionObserver !== 'undefined') {
					visibleObserver = new IntersectionObserver((entries) => {
						for (const entry of entries) visibleRef.current = entry.isIntersecting;
						onChange();
					}, { threshold: 0 });
					visibleObserver.observe(stage);
				}
				// 浮层开合不改变面板尺寸，ResizeObserver 看不到，只能盯 DOM：只认"像浮层"的新节点，
				// 聊天流式渲染那种静态节点不算，免得每来一段字就重扫一遍
				const remember = (node) => {
					if (node === null || node === undefined || node.nodeType !== 1) return;
					const seen = occlSeenRef.current;
					if (seen.indexOf(node) >= 0) return;
					if (seen.length >= OCCL_SEEN_MAX) seen.shift();
					seen.push(node);
				};
				const poke = () => {
					occlAtRef.current = 0;
					report(true);
				};
				/* 一批 DOM 变动只结算一次（一帧内合并）：流式输出时 body 下每秒几十次变动，
				   逐条记录都扫一遍整个文档就是用户报的「卡」。 */
				let domDirty = false;
				const pokeSoon = () => {
					if (domDirty) return;
					domDirty = true;
					const flush = () => {
						domDirty = false;
						if (document.visibilityState === 'hidden') return;
						poke();
					};
					try { window.requestAnimationFrame(flush); } catch { flush(); }
				};
				const suspicious = (node) => {
					if (node === null || node === undefined || node.nodeType !== 1) return false;
					try {
						if (typeof node.matches === 'function' && node.matches(OCCL_SELECTOR)) return true;
					} catch { }
					if (node.isConnected === false) return false;
					try {
						if (node.tagName === 'DIALOG') return true;
						const cs = window.getComputedStyle(node);
						if (cs.position === 'fixed' || cs.position === 'absolute' || cs.position === 'sticky') return true;
						if (cs.zIndex !== '' && cs.zIndex !== 'auto') return true;
					} catch { }
					return false;
				};
				if (typeof MutationObserver !== 'undefined' && document.body !== null) {
					domObserver = new MutationObserver((records) => {
						for (let i = 0; i < records.length; i += 1) {
							const rec = records[i];
							if (rec.type === 'attributes') {
								/* 属性变化量最大（流式渲染一直在改 class/style）。先做零成本的选择器匹配，
								   只有本来就「像浮层」或已在册的节点才继续；其余整条记录丢弃。 */
								if (matchesOccl(rec.target) || occlSeenRef.current.indexOf(rec.target) >= 0) { pokeSoon(); return; }
								continue;
							}
							if (rec.removedNodes.length > 0) {
								for (let k = 0; k < rec.removedNodes.length; k += 1) {
									if (matchesOccl(rec.removedNodes[k])) { pokeSoon(); return; }
								}
								continue;
							}
							const added = rec.addedNodes;
							for (let k = 0; k < added.length && k < 12; k += 1) {
								const node = added[k];
								if (matchesOccl(node) || suspicious(node)) { remember(node); pokeSoon(); return; }
							}
						}
					});
					domObserver.observe(document.body, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
					});
				}
				window.addEventListener('resize', onChange);
				document.addEventListener('scroll', onScroll, true);
				document.addEventListener('visibilitychange', onChange);
				const stored = readStore();
				const remembered = targetRef.current.length > 0
					? targetRef.current
					: (stored.length > 0 && stored !== LEGACY_START_URL ? stored : START_URL);
				targetRef.current = remembered;
				if (urlRef.current.length === 0 || urlRef.current === LEGACY_START_URL) setUrl(remembered);
				const timer = setInterval(() => { if (document.visibilityState !== 'hidden') report(false); }, REPORT_MS);
				const first = setTimeout(() => report(true), 0);
				return () => {
					if (handle !== 0) clearTimeout(handle);
					if (timerRef.current !== 0) { try { window.cancelAnimationFrame(timerRef.current); } catch { /* ignore */ } timerRef.current = 0; }
					clearInterval(timer);
					clearTimeout(first);
					if (observer !== null) observer.disconnect();
					if (visibleObserver !== null) visibleObserver.disconnect();
					if (domObserver !== null) domObserver.disconnect();
					window.removeEventListener('resize', onChange);
					document.removeEventListener('scroll', onScroll, true);
					document.removeEventListener('visibilitychange', onChange);
					if (watchRaf !== 0) { try { window.cancelAnimationFrame(watchRaf); } catch { /* ignore */ } watchRaf = 0; }
					targetRef.current = '';
					lastRef.current = '';
					sentRef.current = '';
					post({ cmd: 'hide' });
				};
			}, [supported, report]);

			const loadMarks = react.useCallback(async () => {
				try {
					const data = await api('/bookmarks');
					if (Array.isArray(data.bookmarks)) setMarks(data.bookmarks);
				} catch { }
			}, []);

			react.useEffect(() => { void loadMarks(); }, [loadMarks]);

			const currentUrl = page.url.length > 0 ? page.url : url;
			const marked = marks.some((item) => item.url === currentUrl);
			const tabs = Array.isArray(page.tabs) ? page.tabs : [];
			const zoomPercent = Math.round((Number(page.zoom) > 0 ? Number(page.zoom) : 1) * 100);
			const activeTabId = (tabs.filter((one) => one.active === true)[0] || {}).id || '';

			// 当前页面的标签始终滚在看得见的地方：不用自己拖标签条去找它（只动横向位置，不碰页面滚动）
			react.useEffect(() => {
				const box = tabsRef.current;
				if (box === null || typeof box.querySelector !== 'function') return;
				const on = box.querySelector('[data-active="1"]');
				if (on === null || typeof on.getBoundingClientRect !== 'function') return;
				const one = on.getBoundingClientRect();
				const all = box.getBoundingClientRect();
				if (one.left < all.left) box.scrollLeft -= (all.left - one.left) + 4;
				else if (one.right > all.right) box.scrollLeft += (one.right - all.right) + 4;
			}, [activeTabId, tabs.length]);

			// 标签条溢出时，滚轮直接横滚（不用按 Shift 去找滑条）；没溢出就不拦，页面该怎么滚怎么滚。
			// React 的 onWheel 在根节点上是 passive 的，preventDefault 不生效，所以这里挂原生监听。
			react.useEffect(() => {
				const box = tabsRef.current;
				if (box === null || typeof box.addEventListener !== 'function') return undefined;
				const onWheel = (event) => {
					if (box.scrollWidth <= box.clientWidth) return;
					const dy = Number(event.deltaY) || 0;
					const dx = Number(event.deltaX) || 0;
					const step = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
					if (step === 0) return;
					event.preventDefault();
					box.scrollLeft += step;
				};
				box.addEventListener('wheel', onWheel, { passive: false });
				return () => { try { box.removeEventListener('wheel', onWheel); } catch { } };
			}, []);

			const toggleMark = async () => {
				try {
					let body;
					if (marked) {
						body = { action: 'remove', url: currentUrl };
					} else {
						const title = String(page.title === undefined || page.title === null ? '' : page.title).trim() || hostOf(currentUrl);
						const icon = await askIcon();
						rememberIcon(currentUrl, icon);
						body = { action: 'add', url: currentUrl, title: title };
					}
					const data = await api('/bookmark', body);
					if (Array.isArray(data.bookmarks)) {
						setMarks(data.bookmarks);
						if (shelfRef.current === true) pushShelf(data.bookmarks);
					}
				} catch { }
			};

			const dropMark = async (target) => {
				try {
					const data = await api('/bookmark', { action: 'remove', url: target });
					if (Array.isArray(data.bookmarks)) {
						setMarks(data.bookmarks);
						if (shelfRef.current === true) pushShelf(data.bookmarks);
					}
				} catch { }
			};

			const mkButton = (name, title, onClick, disabled, onDoubleClick) => h('button', {
				className: 'eb_btn',
				type: 'button',
				title: title,
				disabled: disabled === true,
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => { event.stopPropagation(); onClick(); },
				onDoubleClick: (event) => { event.stopPropagation(); if (typeof onDoubleClick === 'function') onDoubleClick(); }
			}, h(Icon, { name: name }));

			// 加载中的标签把关闭叉换成转圈（点它还是关这个标签，和浏览器一致）
			const mkTab = (tab) => {
				const loading = tab.loading === true;
				return h('div', {
					key: tab.id,
					className: 'eb_tab',
					'data-active': tab.active === true ? '1' : '0',
					title: tab.title + '\n' + tab.url,
					onClick: () => { if (tab.active !== true) post({ cmd: 'selectTab', id: tab.id }); }
				}, h('span', { className: 'eb_tabText' }, tab.title), h('span', {
					className: loading ? 'eb_tabClose eb_tabSpin' : 'eb_tabClose',
					onMouseDown: (event) => event.preventDefault(),
					onClick: (event) => { event.stopPropagation(); post({ cmd: 'closeTab', id: tab.id }); }
				}, h(Icon, { name: loading ? 'reload' : 'stop', size: 10 })));
			};

			const mkMark = (item) => h('div', {
				key: item.url,
				className: 'eb_mark',
				title: item.url,
				onClick: () => { openShelf(false); open(item.url); }
			}, h('img', {
				className: 'eb_fav',
				alt: '',
				src: favicon(item.url),
				onError: (event) => { event.currentTarget.style.visibility = 'hidden'; }
			}), h('span', {
				className: 'eb_markText'
			}, item.title.length > 0 ? item.title : item.url), h('span', {
				className: 'eb_del',
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => { event.stopPropagation(); void dropMark(item.url); }
			}, h(Icon, { name: 'stop', size: 12 })));

			const shelfRows = marks.length === 0 ? [h('div', { className: 'eb_empty', key: 'empty' }, '-')] : marks.map(mkMark);
			const shelfBox = h('div', { className: 'eb_shelf', onMouseDown: (event) => event.stopPropagation() }, h('div', { className: 'eb_shelfList' }, shelfRows));

			const addressBox = h('input', {
				className: 'eb_url',
				ref: urlInputRef,
				value: editing ? draft : currentUrl,
				spellCheck: false,
				// 聚焦即全选（真浏览器的手感），全选在受控值切换后再补一次
				onFocus: (event) => {
					const node = event.currentTarget;
					setDraft(currentUrl);
					setEditing(true);
					try { node.select(); } catch { }
					try { window.requestAnimationFrame(() => { try { node.select(); } catch { } }); } catch { }
				},
				onBlur: () => setEditing(false),
				onChange: (event) => setDraft(event.target.value),
				onKeyDown: (event) => {
					event.stopPropagation();
					if (event.key === 'Enter') {
						event.currentTarget.blur();
						setEditing(false);
						openShelf(false);
						open(draft);
					}
					if (event.key === 'Escape') { setEditing(false); event.currentTarget.blur(); }
				}
			});

			const starButton = h('button', {
				className: 'eb_btn',
				type: 'button',
				title: marked ? '取消收藏' : '收藏当前页',
				'data-on': marked ? '1' : '0',
				disabled: currentUrl.length === 0,
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => { event.stopPropagation(); void toggleMark(); }
			}, h(Icon, { name: marked ? 'starFilled' : 'star' }));

			const listButton = h('button', {
				className: 'eb_btn',
				type: 'button',
				title: '收藏夹',
				'data-on': shelf ? '1' : '0',
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => { event.stopPropagation(); openShelf(!shelf); }
			}, h(Icon, { name: 'list' }));

			const barChildren = [
				mkButton('back', '后退', () => nav('back'), page.canGoBack !== true),
				mkButton('forward', '前进', () => nav('forward'), page.canGoForward !== true),
				page.loading === true
					? mkButton('stop', '停止', () => nav('stop'))
					: mkButton('reload', '重新加载', () => nav('reload')),
				mkButton('home', '首页', () => nav('home')),
				h('div', { className: 'eb_tabs', key: 'tabs', ref: tabsRef }, tabs.map(mkTab)),
				mkButton('plus', '新标签页', () => { openShelf(false); post({ cmd: 'newTab', url: START_URL }); }),
				addressBox,
				starButton,
				listButton
			];
			// 窄栏先收起这两只：缩放还有 Ctrl+± / Ctrl+滚轮，双击任一只回 100%
			if (compact < 1) {
				barChildren.push(mkButton('zoomOut', '缩小 ' + zoomPercent + '%（双击回 100%）', () => nav('zoomOut'), false, () => nav('zoomReset')));
				barChildren.push(mkButton('zoomIn', '放大 ' + zoomPercent + '%（双击回 100%）', () => nav('zoomIn'), false, () => nav('zoomReset')));
			}

			const navBar = h('div', { className: 'eb_bar', ref: barRef }, barChildren);
			// 画面是外壳的原生 WebView2，导航期间它一直显示旧页；这条进度条在原生控件上方，是唯一能即时反映"正在加载"的地方
			const barWrap = h('div', { className: 'eb_barWrap' },
				navBar,
				page.loading === true ? h('div', { className: 'eb_prog', key: 'prog' }, h('div', { className: 'eb_progBar' })) : null);

			const stageChildren = [];
			if (!supported) stageChildren.push(h('span', { className: 'eb_fail', key: 'fail', title: '需要 DSH 桌面窗口' }, h(Icon, { name: 'warn', size: 18 })));
			if (shelf && (!supported || !shellShelf)) stageChildren.push(shelfBox);
			// 一个标签都不剩：外壳会立刻补一个首页，这里兜住它没补上的那几秒（画面区本来就是空的）
			if (emptyVisible) {
				stageChildren.push(h('div', {
					className: 'eb_new',
					key: 'newtab',
					title: '新标签页',
					onClick: (event) => { event.stopPropagation(); post({ cmd: 'newTab', url: START_URL }); }
				}, h(Icon, { name: 'plus', size: 22 })));
			}
			const stage = h('div', { className: 'eb_stage', ref: stageRef, onMouseDown: () => { if (shelf) openShelf(false); } }, stageChildren);

			// 下载条：外壳把每条下载的字节数与状态推过来，这里只画；取消/打开/移除都回外壳做
			const mkDownload = (item) => {
				const total = Number(item.total) || 0;
				const got = Number(item.received) || 0;
				const done = item.state === 'done';
				const fail = item.state === 'fail';
				const percent = done ? 100 : (total > 0 ? Math.min(100, Math.round((got * 100) / total)) : 0);
				const label = fail ? (item.reason || '下载中断') : (done ? '已完成' : (total > 0 ? percent + '%' : fmtBytes(got)));
				const act = (name, title, action) => h('span', {
					className: 'eb_dlAct',
					title: title,
					onMouseDown: (event) => event.preventDefault(),
					onClick: (event) => { event.stopPropagation(); post({ cmd: 'download', action: action, id: item.id }); }
				}, h(Icon, { name: name, size: 12 }));
				return h('div', { className: 'eb_dlRow', key: item.id },
					h('span', { className: 'eb_dlName', title: item.name }, item.name),
					h('span', { className: 'eb_dlBar' }, h('span', {
						className: 'eb_dlFill',
						'data-state': item.state,
						style: { width: percent + '%' }
					})),
					h('span', { className: 'eb_dlPct' }, label),
					done ? act('open', '打开', 'open') : null,
					done ? act('folder', '在文件夹中显示', 'reveal') : null,
					!done && !fail ? act('stop', '取消', 'cancel') : null,
					act('stop', done || fail ? '移除' : '取消并移除', 'clear'));
			};
			const downloadBar = downloads.length > 0
				? h('div', { className: 'eb_dl' }, downloads.map(mkDownload))
				: null;

			// 面板自己拿着焦点时（地址栏、按钮）也能按浏览器的键；画面里那份由外壳注入的脚本接
			const panelKeys = (event) => {
				if (event.ctrlKey !== true || event.altKey === true || event.metaKey === true) return;
				const key = String(event.key === undefined || event.key === null ? '' : event.key).toLowerCase();
				if (key === 't') {
					event.preventDefault();
					openShelf(false);
					post({ cmd: 'newTab', url: START_URL });
					return;
				}
				if (key === 'w') {
					const on = tabs.filter((one) => one.active === true)[0];
					if (on !== undefined) { event.preventDefault(); post({ cmd: 'closeTab', id: on.id }); }
					return;
				}
				if (key === 'l') {
					event.preventDefault();
					const node = urlInputRef.current;
					if (node !== null) { try { node.focus(); node.select(); } catch { } }
					return;
				}
				if (key === 'tab') {
					if (tabs.length < 2) return;
					event.preventDefault();
					let at = tabs.findIndex((one) => one.active === true);
					if (at < 0) at = 0;
					const step = event.shiftKey === true ? -1 : 1;
					post({ cmd: 'selectTab', id: tabs[(at + step + tabs.length) % tabs.length].id });
					return;
				}
				const slot = '12345678'.indexOf(key);
				if (slot >= 0 && slot < tabs.length) { event.preventDefault(); post({ cmd: 'selectTab', id: tabs[slot].id }); }
			};

			return h('div', {
				className: 'eb_root',
				'data-compact': String(compact),
				onKeyDown: panelKeys
			}, barWrap, downloadBar, stage);
		}

		function tabDefinition() {
			return {
				id: TAB_ID,
				kind: TAB_KIND,
				priority: 'extension',
				title: () => '打开浏览器',
				guide: [{
					order: 5,
					title: () => '打开浏览器',
					description: () => '在右栏里开一个浏览器，页面就长在面板里',
					icon: ({ size }) => h(Icon, { name: 'globe', size: size === undefined || size === null ? 22 : size })
				}]
			};
		}

		function apply(ctx) {
			let disposeType = null;
			let tries = 0;
			const attempt = () => {
				let registry;
				try { registry = ctx.get('sidebarRightTabs'); } catch { registry = undefined; }
				if (registry !== undefined && registry !== null && typeof registry.register === 'function') {
					try { disposeType = registry.register(tabDefinition()); } catch { }
					return;
				}
				tries += 1;
				if (tries < 40) setTimeout(attempt, 500);
			};
			attempt();
			try {
				ctx.on('dispose', () => { if (typeof disposeType === 'function') { try { disposeType(); } catch { } } });
			} catch { }
			try { ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
				name: 'sidebar.right.pane.tab',
				key: TAB_ID,
				inject: () => ({})
			}, BrowserPanel)); } catch (error) {
				console.error('[dsh-embedded-browser] pane slot registration failed', error);
			}
		}

		exports.apply = apply;
		exports.inject = ['slots'];
		exports.BrowserPanel = BrowserPanel;
		exports.normalizeUrl = normalizeUrl;
		console.log('[dsh-embedded-browser] client applied');
		return module.exports;
	}
});