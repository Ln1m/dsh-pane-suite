/**
 * dsh-rightpane-eyes -- 宿主半边。
 *
 * 右栏（拓展栏）里打开的本地文件，由浏览器半边在「技能档」那一排画成
 * 「眼睛 + 文件名」胶囊。宿主这边只做两件事：
 *   1. 收下每个会话的清单（POST /rightpane-eyes/api/state），落盘备用；
 *   2. 在该会话 agent 的作用域里注册一条动态上下文（systemPrompt.context），
 *      文本 = 这个会话里「可见」文件的路径清单。
 *
 * 注入纪律（官方 context 的语义，与 dsh-skill-sets 同源）：
 *   - 文本变了才新增一条消息，没变不产生任何东西 —— 清单不动就不会每轮重复注入；
 *   - 文本为空到空串时整条丢弃 —— 全部隐藏/关闭后不再留悬挂的旧认知；
 *   - 只给路径，不给内容：模型要看内容自己按路径读，省 token。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const name = "dsh-rightpane-eyes";
export const inject = ["agents", "webServer"];

/** 浏览器半边上报清单、也用它回读（同一路径，GET 带 ?session=）。 */
export const ROUTE_STATE = "/rightpane-eyes/api/state";

const CONTEXT_NAME = "host:rightpane-eyes-visible";
/** 排在官方 context（沙箱 110 / 审批 115 / 子代理 120）之后，别插队。 */
const CONTEXT_ORDER = 130;
const DSH_ROOT = process.env.DSH_ROOT || join(homedir(), "DeepSeek_harness");
const STATE_PATH = join(DSH_ROOT, "storages", "rightpane-eyes.json");
const MAX_ITEMS = 60;
const MAX_PATH = 1024;
const MAX_TITLE = 200;

/** sessionId -> { items: [{ path, title, visible }] } */
const bySession = new Map();
/** agent -> { context }，卸载时按 agent 收回。 */
const installed = new WeakMap();
let saveTimer = null;

function sessionIdOf(agent) {
  return agent?.id ?? agent?.session?.id ?? "";
}

/** 只收形状对的条目：path 非空、长度设上限、visible 严格布尔。 */
function cleanItems(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const item of raw.slice(0, MAX_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const path = typeof item.path === "string" ? item.path.trim().slice(0, MAX_PATH) : "";
    if (path.length === 0) continue;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, MAX_TITLE) : "";
    out.push({ path, title, visible: item.visible === true });
  }
  return out;
}

/**
 * 一个会话的模型侧文本：可见文件的路径清单，按 path 去重。
 * @param sessionId - 会话 id。
 * @returns 文本；没有可见文件时返回空串（空贡献会被官方整条丢掉）。
 */
export function visibleText(sessionId) {
  const rec = bySession.get(sessionId);
  if (!rec || rec.items.length === 0) return "";
  const seen = new Set();
  const rows = [];
  for (const item of rec.items) {
    if (item.visible !== true || seen.has(item.path)) continue;
    seen.add(item.path);
    rows.push(item.path);
  }
  if (rows.length === 0) return "";
  return [
    "用户此刻在拓展栏打开、且标为可见的文件（要看内容自己按路径读）：",
    ...rows.map((p) => "- " + p),
  ].join("\n");
}

function loadState() {
  try {
    if (!existsSync(STATE_PATH)) return;
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    const sessions = parsed && parsed.sessions;
    if (!sessions || typeof sessions !== "object") return;
    for (const sid of Object.keys(sessions)) {
      const items = cleanItems(sessions[sid] && sessions[sid].items);
      if (sid && items.length > 0) bySession.set(sid, { items });
    }
  } catch {
    /* 状态文件坏了就当空，绝不拦住启动 */
  }
}

function saveState() {
  try {
    const sessions = {};
    for (const [sid, rec] of bySession) sessions[sid] = { items: rec.items };
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify({ version: 1, sessions }, null, 2), "utf8");
  } catch {
    /* 落盘失败只影响重启后的恢复，注入本身照常 */
  }
}

function scheduleSave() {
  if (saveTimer !== null) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveState();
  }, 500);
  if (saveTimer && typeof saveTimer.unref === "function") saveTimer.unref();
}

/** agent/created 里必须同步注册：该 emit 不 await 监听器。 */
function install(ctx, agent) {
  uninstall(agent);
  let prompt;
  try {
    prompt = agent.ctx.get("systemPrompt");
  } catch (error) {
    ctx.logger?.warn?.(`rightpane-eyes: systemPrompt unavailable: ${String(error)}`);
    return;
  }
  if (!prompt || typeof prompt.context !== "function") return;
  const sid = sessionIdOf(agent);
  const entry = { context: undefined };
  try {
    entry.context = prompt.context({
      name: CONTEXT_NAME,
      order: CONTEXT_ORDER,
      text: () => visibleText(sid),
    });
  } catch (error) {
    ctx.logger?.warn?.(`rightpane-eyes: context registration failed: ${String(error)}`);
  }
  installed.set(agent, entry);
}

function uninstall(agent) {
  const entry = installed.get(agent);
  if (!entry) return;
  installed.delete(agent);
  try {
    if (typeof entry.context === "function") entry.context();
  } catch {
    /* 已被上游收回就当无事 */
  }
}

/**
 * 精确匹配的 JSON 路由：永远回 200 + JSON，方便浏览器半边区分「路由不在」与「插件报错」。
 *
 * ⚠️ 官方 `webServer.register` 按 (kind, path) 去重，**同一路径注册第二次会抛**，
 * 所以 GET/POST 必须在**一个** handler 里按方法分发，不能注册两条。
 * @param ctx - 插件上下文。
 * @param path - 绝对路径（不带尾斜杠）。
 * @param handlers - { GET, POST, ... } 方法 → 处理函数。
 */
function jsonRoute(ctx, path, handlers) {
  const webServer = ctx.get("webServer");
  if (!webServer) return;
  try {
    webServer.register({
      kind: "exact",
      path,
      handler: async (req, res) => {
        let result;
        try {
          const handler = handlers[String(req.method || "GET").toUpperCase()];
          result = typeof handler === "function"
            ? await handler(req)
            : { ok: false, error: "method-not-allowed" };
        } catch (error) {
          result = { ok: false, error: String((error && error.message) || error).slice(0, 300) };
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      },
    });
  } catch (error) {
    ctx.logger?.warn?.(`rightpane-eyes: could not register ${path}: ${String(error)}`);
  }
}

export function apply(ctx) {
  loadState();

  ctx.on("agent/created", ({ agent }) => {
    try {
      install(ctx, agent);
    } catch (error) {
      ctx.logger?.warn?.(`rightpane-eyes: install failed: ${String(error)}`);
    }
  });
  ctx.on("agent/disposed", ({ agent }) => {
    uninstall(agent);
  });

  jsonRoute(ctx, ROUTE_STATE, {
    GET: async (req) => {
      const url = new URL(req.url || "/", "http://localhost");
      const sessionId = (url.searchParams.get("session") || "").trim();
      if (!sessionId) return { ok: false, error: "missing-session" };
      const rec = bySession.get(sessionId);
      return { ok: true, session: sessionId, items: rec ? rec.items : [] };
    },

    POST: async (req) => {
      let body = "";
      try {
        for await (const chunk of req) body += chunk;
      } catch {
        /* 截断的 body 交给下面的 JSON 解析报错 */
      }
      let parsed = {};
      try {
        parsed = body ? JSON.parse(body) : {};
      } catch {
        return { ok: false, error: "bad-json" };
      }
      const sessionId = typeof parsed.session === "string" ? parsed.session.trim() : "";
      if (!sessionId) return { ok: false, error: "missing-session" };
      const items = cleanItems(parsed.items);
      if (items.length === 0) bySession.delete(sessionId);
      else bySession.set(sessionId, { items });
      scheduleSave();
      return { ok: true, session: sessionId, count: items.length };
    },
  });
}
