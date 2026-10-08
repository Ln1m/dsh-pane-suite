// dsh-rightpane-eyes —— 浏览器半边。
// 位置：骨架的「横排共享行」vk.input.dock（契约表新加的一条），与技能档 pill 同一条行内、各占自己的分区：
//   顺序按 order（技能档 10、这里 20），行几何由骨架的 .vk_dockRow 统一给（同宽上限 + 居中 + 换行 + 6px 间距）。
//   本插件只画自己的分区，不碰别人的 DOM，也不改别人的 CSS。骨架不在时退回官方 conversation.input.dock。
// 形态：折叠态一枚 pill —— 睁眼（蓝）+「N 个文件」+ 箭头，N = 已注入（可见）的文件数；
//   展开后是一个面板：每行一个文件，点行内眼睛单独切注入/不注入，点 × 从列表收掉；
//   面板底部「新增」= 在右栏打开「打开本机文件」，选中的文件自动进这个列表。
// 数据：列表 = 右栏当前打开的本地文件（按路径去重）；可见性按会话存 localStorage。
//   可见 = 该文件路径随上下文进模型（宿主 systemPrompt.context，变一次才注入一次）；隐藏 = 只列着。
// 尺寸与配色逐条对齐 .dss_pill / .dss_pill.dss_on / .dss_drawer / .dss_panel。

window.__ModuleLoader__.load({
  id: 'dsh-rightpane-eyes',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    var React = require('react');
    const h = React.createElement;

    const ctxRef = { current: null };
    const ROUTE_STATE = '/rightpane-eyes/api/state';
    const POLL_MS = 900;
    const PREF_PREFIX = 'dsh-rightpane-eyes.v1.';
    const FILE_PREFIX = 'dsh-resource://file/session/';
    /** 骨架的共享行槽；骨架不在时退回官方槽（那时由 .drpe_standalone 自己给几何）。 */
    const VK_DOCK_SLOT = 'vk.input.dock';
    const OFFICIAL_DOCK_SLOT = 'conversation.input.dock';
    /** 右栏「打开本机文件」那一栏的类型（dsh-files-open 注册）。 */
    const PICKER_KIND = 'files';

    const CSS = `
/* 行内的一个分区：按内容定宽；几何（宽度上限/居中/间距）由骨架的 .vk_dockRow 给 */
.drpe_row{position:relative;display:inline-flex;align-items:center;margin:0;z-index:80;}
/* 骨架不在时的退化形态：自己做一行，几何照抄原 .dss_dock */
.drpe_standalone{box-sizing:border-box;display:flex;width:calc(100% - 2 * var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,780px);margin:0 auto 8px;}
/* 折叠态 pill：逐条对齐 .dss_pill */
.drpe_pill{box-sizing:border-box;max-width:100%;height:28px;display:inline-flex;align-items:center;gap:7px;padding:0 8px 0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--vk-r-pill,999px);background:var(--dsw-specific-tip,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit;font-size:var(--vk-fs-sm,12px);line-height:1;transition:background .15s ease,color .15s ease,border-color .15s ease;}
.drpe_pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.drpe_pill.drpe_on{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent);color:var(--dsw-alias-label-primary);}
.drpe_mark{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary);}
.drpe_pill.drpe_on .drpe_mark{color:var(--dsw-alias-state-business-primary);}
.drpe_pill_count{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:var(--vk-r-pill,999px);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-caption);font-size:var(--vk-fs-xs,11px);line-height:1;font-variant-numeric:tabular-nums;}
.drpe_pill_count.drpe_countOn{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 13%,transparent);color:var(--dsw-alias-state-business-primary);}
.drpe_chev{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary);transition:transform .18s ease;}
.drpe_pill.drpe_open .drpe_chev{transform:rotate(180deg);}
/* 展开面板：向上弹，几何对齐 .dss_drawer / .dss_panel */
.drpe_drawer{position:absolute;left:0;bottom:calc(100% + 6px);width:320px;max-width:82vw;opacity:0;pointer-events:none;transition:opacity .18s ease;z-index:90;}
.drpe_drawer.drpe_open{opacity:1;pointer-events:auto;}
.drpe_panel{display:flex;flex-direction:column;gap:2px;max-height:280px;overflow-y:auto;padding:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--vk-r-lg,12px);background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-2));box-shadow:var(--dsw-shadow-lv2);}
.drpe_item{display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:var(--vk-r-md,8px);color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit;font-size:var(--vk-fs-sm,12px);line-height:1;transition:background .12s ease,color .12s ease;}
.drpe_item:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.drpe_item_eye{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary);}
.drpe_item.drpe_itemOn .drpe_item_eye{color:var(--dsw-alias-state-business-primary);}
.drpe_item_name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.drpe_item_path{flex:none;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--dsw-alias-label-caption);}
.drpe_item_x{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;color:var(--dsw-alias-label-tertiary);}
.drpe_item_x:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary);}
.drpe_add{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px;padding:5px;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--vk-r-md,8px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit;font-size:var(--vk-fs-sm,12px);line-height:1;transition:border-color .12s ease,color .12s ease;}
.drpe_add:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);}
`;

    function insertStyles(css) {
      try {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return () => { try { style.remove(); } catch { /* ignore */ } };
      } catch {
        return () => {};
      }
    }

    function icon(paths, size) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size || 14, height: size || 14, fill: 'none',
        stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, dangerouslySetInnerHTML: { __html: paths },
      });
    }
    const EyeOn = () => icon('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>');
    const EyeOff = () => icon('<path d="M3 3l18 18"/><path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-2.5 3.2"/><path d="M6.4 8.1A16 16 0 0 0 2 12s3.6 6.5 10 6.5c1.2 0 2.3-.2 3.2-.6"/><path d="M9.9 10.1a2.6 2.6 0 0 0 3.7 3.7"/>');
    const Chevron = () => icon('<path d="m6 9 6 6 6-6"/>', 13);
    const Close = () => icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 12);
    const Plus = () => icon('<path d="M12 5v14"/><path d="M5 12h14"/>', 13);

    /** 当前会话 cwd（sessions 服务快照），相对路径地址要用它还原成磁盘路径。 */
    function currentCwd() {
      try {
        const svc = ctxRef.current.get('sessions');
        const snap = svc.list.getSnapshot();
        const byId = snap !== undefined && snap !== null && snap.byId !== undefined && snap.byId !== null ? snap.byId : null;
        let row = null;
        if (byId !== null) {
          for (const key of Object.keys(byId)) {
            const candidate = byId[key];
            if (candidate !== null && candidate !== undefined && ((candidate.retainedBy && candidate.retainedBy.mainView) || 0) > 0) { row = candidate; break; }
          }
        }
        return row !== null && row.blank !== true && typeof row.cwd === 'string' ? row.cwd : '';
      } catch { return ''; }
    }

    /** 文件资源地址 → 磁盘路径（与查看器同款：逐段解码，相对路径用 cwd 补全）。 */
    function filePathOfAddress(address) {
      if (typeof address !== 'string' || !address.startsWith(FILE_PREFIX)) return null;
      const rest = address.slice(FILE_PREFIX.length);
      const cut = rest.indexOf('/');
      if (cut < 0) return null;
      const encoded = rest.slice(cut + 1);
      const decoded = encoded.split('/').map((seg) => { try { return decodeURIComponent(seg); } catch { return seg; } }).join('/');
      if (decoded.length === 0) return null;
      if (!/^[A-Za-z]:[\\/]/.test(decoded) && !decoded.startsWith('/')) {
        const cwd = currentCwd();
        if (cwd.length > 0) return cwd.replace(/[\\/]+$/, '') + '\\' + decoded.replace(/\//g, '\\');
      }
      return decoded;
    }

    function baseName(path) {
      const parts = String(path).split(/[\\/]/);
      return parts[parts.length - 1] || path;
    }

    /** 文件所在目录（列表里显示在文件名右边，便于区分同名文件）。 */
    function dirName(path) {
      const parts = String(path).split(/[\\/]/);
      parts.pop();
      return parts.length > 0 ? parts[parts.length - 1] : '';
    }

    function readPrefs(sessionId) {
      const empty = { vis: {}, dis: [] };
      try {
        const raw = window.localStorage.getItem(PREF_PREFIX + sessionId);
        if (!raw) return empty;
        const parsed = JSON.parse(raw);
        return {
          vis: parsed && typeof parsed.vis === 'object' && parsed.vis !== null ? parsed.vis : {},
          dis: parsed && Array.isArray(parsed.dis) ? parsed.dis.filter((x) => typeof x === 'string') : [],
        };
      } catch { return empty; }
    }

    function writePrefs(sessionId, prefs) {
      try { window.localStorage.setItem(PREF_PREFIX + sessionId, JSON.stringify(prefs)); } catch { /* 存不下只影响下次刷新 */ }
    }

    /** 右栏里当前打开的本地文件清单（按打开顺序，按路径去重）。 */
    function collectFiles(sessionId) {
      let tabs = [];
      try {
        const right = ctxRef.current.get('sidebarRight');
        if (right) {
          try {
            const inv = right.openTabs;
            const snap = inv && typeof inv.getSnapshot === 'function' ? inv.getSnapshot() : (typeof inv === 'function' ? inv() : inv);
            if (Array.isArray(snap)) tabs = snap;
          } catch { /* 落回 tabsIn */ }
          if (tabs.length === 0 && typeof right.tabsIn === 'function') {
            try {
              const records = right.tabsIn(sessionId);
              if (Array.isArray(records)) tabs = records;
            } catch { /* 没有就空着 */ }
          }
        }
      } catch { /* 右栏服务还没就绪 */ }
      const out = [];
      const seen = new Set();
      for (const tab of tabs) {
        if (!tab) continue;
        if (typeof tab.sessionId === 'string' && tab.sessionId !== sessionId) continue;
        const address = typeof tab.contentId === 'string' ? tab.contentId
          : (typeof tab.address === 'string' ? tab.address : (typeof tab.url === 'string' ? tab.url : ''));
        const path = filePathOfAddress(address);
        if (path === null || seen.has(path)) continue;
        seen.add(path);
        const title = typeof tab.title === 'string' && tab.title.trim().length > 0 ? tab.title.trim() : baseName(path);
        out.push({ path: path, title: title });
      }
      return out;
    }

    function keyOf(items) {
      return items.map((it) => (it.visible ? '+' : '-') + it.path).join('\n');
    }

    /** 在右栏打开「打开本机文件」那一栏：他在那边选中的文件会自己进这个列表。 */
    function openPicker() {
      try {
        const right = ctxRef.current.get('sidebarRight');
        if (right && typeof right.openTab === 'function') right.openTab(PICKER_KIND);
      } catch { /* 该栏没注册就算了，不弹错 */ }
    }

    function EyesChips(props) {
      const sessionId = props && typeof props.sessionId === 'string' ? props.sessionId : '';
      const inlineDock = props && props.inlineDock === true;
      const [items, setItems] = React.useState([]);
      const [open, setOpen] = React.useState(false);
      const rootRef = React.useRef(null);

      React.useEffect(() => {
        if (!sessionId) return undefined;
        let alive = true;
        const tick = () => {
          if (!alive) return;
          const files = collectFiles(sessionId);
          const prefs = readPrefs(sessionId);
          const live = new Set(files.map((f) => f.path));
          const next = [];
          for (const file of files) {
            if (prefs.dis.indexOf(file.path) >= 0) continue;
            next.push({ path: file.path, title: file.title, dir: dirName(file.path), visible: prefs.vis[file.path] !== false });
          }
          // 收掉已关闭文件的偏好，别让存档无限长大
          const trimmed = { vis: {}, dis: prefs.dis.filter((p) => live.has(p)) };
          for (const key of Object.keys(prefs.vis)) if (live.has(key)) trimmed.vis[key] = prefs.vis[key];
          if (Object.keys(trimmed.vis).length !== Object.keys(prefs.vis).length || trimmed.dis.length !== prefs.dis.length) {
            writePrefs(sessionId, trimmed);
          }
          setItems((prev) => (keyOf(prev) === keyOf(next) ? prev : next));
        };
        tick();
        const timer = setInterval(tick, POLL_MS);
        return () => { alive = false; clearInterval(timer); };
      }, [sessionId]);

      // 展开时点外面 / Esc 收起（与技能档 pill 同款手感）
      React.useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => {
          const root = rootRef.current;
          if (root && event && event.target && !root.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => { if (event && event.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('mousedown', onDown, true);
          document.removeEventListener('keydown', onKey);
        };
      }, [open]);

      const reportKey = keyOf(items);
      React.useEffect(() => {
        if (!sessionId) return;
        const payload = JSON.stringify({
          session: sessionId,
          items: items.map((it) => ({ path: it.path, title: it.title, visible: it.visible })),
        });
        fetch(ROUTE_STATE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload }).catch(() => {});
      }, [sessionId, reportKey]);

      const toggle = (path) => {
        const prefs = readPrefs(sessionId);
        const nowVisible = prefs.vis[path] !== false;
        prefs.vis[path] = !nowVisible;
        writePrefs(sessionId, prefs);
        setItems((prev) => prev.map((it) => (it.path === path ? { ...it, visible: !nowVisible } : it)));
      };
      const dismiss = (path) => {
        const prefs = readPrefs(sessionId);
        if (prefs.dis.indexOf(path) < 0) prefs.dis.push(path);
        writePrefs(sessionId, prefs);
        setItems((prev) => prev.filter((it) => it.path !== path));
      };
      const add = () => { setOpen(false); openPicker(); };

      // 一直显示这一枚：右栏一个文件都没开时也要有入口——「新增」就在展开的面板里。
      // （之前是 0 个文件就整枚消失，等于没有入口可加。）
      const injected = items.filter((it) => it.visible).length;

      const body = h('div', { className: 'drpe_row', ref: rootRef },
        h('button', {
          type: 'button',
          className: 'drpe_pill' + (injected > 0 ? ' drpe_on' : '') + (open ? ' drpe_open' : ''),
          title: items.length > 0
            ? '已注入 ' + injected + ' / ' + items.length + ' 个文件（点开逐个控制）'
            : '还没有文件（点开可新增）',
          onClick: () => setOpen(!open),
        },
          h('span', { className: 'drpe_mark' }, h(EyeOn)),
          items.length > 0
            ? h('span', { className: 'drpe_pill_count' + (injected > 0 ? ' drpe_countOn' : '') }, injected + ' / ' + items.length)
            : null,
          h('span', { className: 'drpe_chev' }, h(Chevron)),
        ),
        h('div', { className: 'drpe_drawer' + (open ? ' drpe_open' : '') },
          h('div', { className: 'drpe_panel' },
            items.map((it) => h('div', {
              key: it.path,
              className: 'drpe_item' + (it.visible ? ' drpe_itemOn' : ''),
              title: (it.visible ? '已注入：' : '未注入：') + it.path,
              onClick: () => toggle(it.path),
            },
              h('span', { className: 'drpe_item_eye' }, it.visible ? h(EyeOn) : h(EyeOff)),
              h('span', { className: 'drpe_item_name' }, it.title),
              it.dir ? h('span', { className: 'drpe_item_path' }, it.dir) : null,
              h('span', {
                className: 'drpe_item_x',
                title: '从列表收掉（文件没关，重新打开会再出现）',
                onClick: (event) => { event.stopPropagation(); dismiss(it.path); },
              }, h(Close)),
            )),
            h('button', { type: 'button', className: 'drpe_add', title: '在右栏打开「打开本机文件」，选中的文件会自动进这个列表', onClick: add },
              h(Plus), '新增文件'),
          ),
        ),
      );

      // 在共享行里：这一层就是行内的一个分区；退化路径下再套一层自带几何的容器。
      if (inlineDock) return body;
      return h('div', { className: 'drpe_standalone' }, body);
    }

    const inject = ['slots'];

    function apply(ctx) {
      ctxRef.current = ctx;
      insertStyles(CSS);
      const slots = ctx.get('slots');
      if (slots === undefined) return;
      // 骨架在 → 挂共享行（与技能档同一行、各占分区）；不在 → 退回官方槽，自带几何。
      let dockSlot = OFFICIAL_DOCK_SLOT;
      let inlineDock = false;
      try {
        if (ctx.get('vkLayout') !== undefined) { dockSlot = VK_DOCK_SLOT; inlineDock = true; }
      } catch { /* 骨架不在 */ }
      const entry = { name: dockSlot, id: 'dsh-rightpane-eyes', order: 20, label: '拓展栏眼睛' };
      const component = inlineDock
        ? (props) => h(EyesChips, Object.assign({}, props, { inlineDock: true }))
        : EyesChips;
      // 直接调 slots.inject，绝不包 ctx.effect（否则 client bundle 报 "loaded without registering"）。
      slots.inject(dockSlot, () => slots.register(entry, component));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
