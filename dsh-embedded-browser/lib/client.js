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
		const REPORT_MS = 800;
		const MIN_SIZE = 40;
		// 遮挡检测：原生画面永远在主界面之上，DSH 里的 DOM 浮层压过来没法正确层叠，
		// 所以面板被非面板元素盖住哪怕一点，就把画面整块藏起来，浮层收起后再报矩形让它回来。
		const OCCL_MIN = 8;          // 覆盖边小于这个尺寸的（拖拽条 / 分隔线）不算遮挡
		const OCCL_THROTTLE = 120;   // 两次遮挡扫描的最小间隔（单次约 5ms）
		const OCCL_SEEN_MAX = 200;   // 动态记住的"像浮层"节点上限
		const OCCL_SELECTOR = '[aria-modal],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[role="tooltip"],dialog,[class*="mask"],[class*="overlay"],[class*="modal"],[class*="dialog"],[class*="popup"],[class*="dropdown"],[class*="menu"],[class*="tooltip"],[class*="toast"],[class*="drawer"],[class*="sheet"]';
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
			'.eb_root{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-specific-sidebar-fill)}',
			'.eb_bar{display:flex;align-items:center;gap:2px;height:38px;box-sizing:border-box;padding:0 6px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:0 0 auto}',
			'.eb_btn{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:0}',
			'.eb_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.eb_btn:disabled{opacity:.35;cursor:default}',
			'.eb_btn[data-on="1"]{color:var(--dsw-alias-brand-primary)}',
			'.eb_tabs{display:flex;align-items:center;gap:3px;flex:0 1 auto;min-width:0;max-width:42%;overflow-x:auto;overflow-y:hidden;margin:0 3px}',
			'.eb_tab{display:flex;align-items:center;gap:3px;flex:0 0 auto;height:21px;max-width:124px;padding:0 4px 0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer}',
			'.eb_tab[data-active="1"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3)}',
			'.eb_tabText{max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.eb_tabClose{display:flex;flex:0 0 auto;opacity:.55;border-radius:4px;padding:1px}',
			'.eb_tabClose:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover)}',
			'.eb_url{flex:1 1 auto;min-width:90px;height:24px;margin:0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);font-size:12px;padding:0 8px;outline:none}',
			'.eb_url:focus{border-color:var(--dsw-alias-border-l3)}',
			'.eb_shelf{position:absolute;top:6px;right:6px;width:300px;max-width:calc(100% - 12px);max-height:calc(100% - 12px);z-index:5;display:flex;flex-direction:column;background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 14px 34px rgba(0,0,0,.45);overflow:hidden}',
			'.eb_shelfList{flex:1 1 auto;min-height:0;overflow:auto;padding:4px 0}',
			'.eb_mark{display:flex;align-items:center;gap:8px;padding:6px 10px;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer}',
			'.eb_mark:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.eb_fav{flex:0 0 auto;width:16px;height:16px;border-radius:3px;object-fit:contain}',
			'.eb_markText{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.eb_del{flex:0 0 auto;display:flex;opacity:.55}',
			'.eb_del:hover{opacity:1}',
			'.eb_empty{padding:8px;font-size:12px;color:var(--dsw-alias-label-tertiary)}',
			'.eb_stage{position:relative;flex:1 1 auto;min-height:0}',
			'.eb_barWrap{position:relative;flex:0 0 auto}',
			'.eb_prog{position:absolute;left:0;right:0;bottom:0;height:2px;overflow:hidden;pointer-events:none}',
			'.eb_progBar{position:absolute;top:0;bottom:0;width:35%;border-radius:2px;background:var(--dsw-alias-brand-primary);animation:eb_progSlide 1.15s cubic-bezier(.62,.04,.35,1) infinite}',
			'@keyframes eb_progSlide{0%{left:-35%}100%{left:100%}}',
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
			const stageRef = react.useRef(null);
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
			const emptyAtRef = react.useRef(0);
			const loggedRef = react.useRef('');
			const iconWaiterRef = react.useRef(null);
			const openRef = react.useRef(null);
			const supported = bridge() !== null;

			urlRef.current = url;

			const post = (payload) => {
				const b = bridge();
				if (b === null) return;
				try { b.postMessage(Object.assign({ kind: 'dsh-embed' }, payload)); } catch { }
			};

			const nav = (action) => { post({ cmd: 'nav', action }); };

			const geometry = () => {
				const stage = stageRef.current;
				if (stage === null) return null;
				const rect = stage.getBoundingClientRect();
				if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return null;
				return {
					x: Math.round(rect.left),
					y: Math.round(rect.top),
					w: Math.round(rect.width),
					h: Math.round(rect.height),
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
					if (data.kind === 'dsh-embed-shelf') {
						if (data.ack === true) { shellShelfRef.current = true; setShellShelf(true); return; }
						if (typeof data.url === 'string' && data.url.length > 0) { openShelf(false); open(data.url); }
						else if (data.closed === true) { shelfRef.current = false; setShelf(false); }
						return;
					}
					if (data.kind !== 'dsh-embed-state') return;
					setPage((old) => Object.assign({}, old, data, { tabs: Array.isArray(data.tabs) ? data.tabs : old.tabs }));
					// 标签页被关到零个：外壳里再没有能挂画面的标签，面板只剩一条空工具栏。
					// 补一个首页标签，标签条永远不空（要关浏览器就关右栏里这个标签，不是把标签页关空）。
					if (Array.isArray(data.tabs) && data.tabs.length === 0) {
						const now = Date.now();
						if (now - emptyAtRef.current > 1500) {
							emptyAtRef.current = now;
							post({ cmd: 'newTab', url: START_URL });
						}
					}
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
				// 拖右栏要跟手：30ms 前沿+后沿节流（不做 120ms 防抖，否则要等手停下来画面才动）
				const onChange = () => {
					const now = Date.now();
					const gap = now - lastTickRef.current;
					if (gap >= 30) {
						lastTickRef.current = now;
						report(false);
						return;
					}
					if (timerRef.current !== 0) return;
					timerRef.current = setTimeout(() => {
						timerRef.current = 0;
						lastTickRef.current = Date.now();
						report(false);
					}, 30 - gap);
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
						for (const rec of records) {
							if (rec.type === 'attributes') {
								if (suspicious(rec.target)) { remember(rec.target); poke(); return; }
								continue;
							}
							if (rec.removedNodes.length > 0) {
								for (let i = 0; i < rec.removedNodes.length; i++) {
									const gone = rec.removedNodes[i];
									if (gone !== null && gone !== undefined && gone.nodeType === 1 && typeof gone.matches === 'function') {
										let matched = false;
										try { matched = gone.matches(OCCL_SELECTOR); } catch { matched = false; }
										if (matched) { poke(); return; }
									}
								}
								continue;
							}
							for (let i = 0; i < rec.addedNodes.length; i++) {
								if (suspicious(rec.addedNodes[i])) { remember(rec.addedNodes[i]); poke(); return; }
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
				window.addEventListener('scroll', onChange, true);
				document.addEventListener('visibilitychange', onChange);
				const stored = readStore();
				const remembered = targetRef.current.length > 0
					? targetRef.current
					: (stored.length > 0 && stored !== LEGACY_START_URL ? stored : START_URL);
				targetRef.current = remembered;
				if (urlRef.current.length === 0 || urlRef.current === LEGACY_START_URL) setUrl(remembered);
				const timer = setInterval(() => report(false), REPORT_MS);
				const first = setTimeout(() => report(true), 0);
				return () => {
					if (handle !== 0) clearTimeout(handle);
					if (timerRef.current !== 0) { clearTimeout(timerRef.current); timerRef.current = 0; }
					clearInterval(timer);
					clearTimeout(first);
					if (observer !== null) observer.disconnect();
					if (visibleObserver !== null) visibleObserver.disconnect();
					if (domObserver !== null) domObserver.disconnect();
					window.removeEventListener('resize', onChange);
					window.removeEventListener('scroll', onChange, true);
					document.removeEventListener('visibilitychange', onChange);
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

			const mkButton = (name, title, onClick, disabled) => h('button', {
				className: 'eb_btn',
				type: 'button',
				title: title,
				disabled: disabled === true,
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => { event.stopPropagation(); onClick(); }
			}, h(Icon, { name: name }));

			const mkTab = (tab) => h('div', {
				key: tab.id,
				className: 'eb_tab',
				'data-active': tab.active === true ? '1' : '0',
				title: tab.title + '\n' + tab.url,
				onClick: () => { if (tab.active !== true) post({ cmd: 'selectTab', id: tab.id }); }
			}, h('span', { className: 'eb_tabText' }, tab.title), h('span', {
				className: 'eb_tabClose',
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => { event.stopPropagation(); post({ cmd: 'closeTab', id: tab.id }); }
			}, h(Icon, { name: 'stop', size: 10 })));

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
				value: editing ? draft : currentUrl,
				spellCheck: false,
				onFocus: () => { setDraft(currentUrl); setEditing(true); },
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
				h('div', { className: 'eb_tabs', key: 'tabs' }, tabs.map(mkTab)),
				mkButton('plus', '新标签页', () => { openShelf(false); post({ cmd: 'newTab', url: START_URL }); }),
				addressBox,
				starButton,
				listButton,
				mkButton('zoomOut', '缩小 ' + zoomPercent + '%', () => nav('zoomOut')),
				mkButton('zoomIn', '放大 ' + zoomPercent + '%', () => nav('zoomIn'))
			];

			const navBar = h('div', { className: 'eb_bar' }, barChildren);
			// 画面是外壳的原生 WebView2，导航期间它一直显示旧页；这条进度条在原生控件上方，是唯一能即时反映"正在加载"的地方
			const barWrap = h('div', { className: 'eb_barWrap' },
				navBar,
				page.loading === true ? h('div', { className: 'eb_prog', key: 'prog' }, h('div', { className: 'eb_progBar' })) : null);

			const stageChildren = [];
			if (!supported) stageChildren.push(h('span', { className: 'eb_fail', key: 'fail', title: '需要 DSH 桌面窗口' }, h(Icon, { name: 'warn', size: 18 })));
			if (shelf && (!supported || !shellShelf)) stageChildren.push(shelfBox);
			const stage = h('div', { className: 'eb_stage', ref: stageRef, onMouseDown: () => { if (shelf) openShelf(false); } }, stageChildren);

			return h('div', { className: 'eb_root' }, barWrap, stage);
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