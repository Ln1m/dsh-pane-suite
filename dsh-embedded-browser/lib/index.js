// dsh-embedded-browser — 右栏内嵌浏览器（host 半）：只提供本机 JSON 路由（收藏夹 / 历史存盘）。
//
// 面板里那块视图是 DSH 桌面外壳（dsh-desktop，WinForms + Microsoft.Web.WebView2）主窗体里
// Controls.Add 的一块 WebView2 原生控件，由外壳按面板矩形摆位；插件侧不起任何浏览器进程、
// 不开窗口、不 SetParent 别人的窗口、不做裁剪去边框。
//
// 路由：
//   GET  /embedded-browser/bookmarks → { ok, bookmarks:[{url,title,at}] }
//   POST /embedded-browser/bookmark  body { action: add|remove, url, title? }
//   GET  /embedded-browser/history   → { ok, history:[{url,title,at}] }
//   POST /embedded-browser/history   body { url, title? }
//
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "dsh-embedded-browser";
export const inject = ["webServer"];

const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(PLUGIN_ROOT, "data");
const BOOKMARK_FILE = join(DATA_DIR, "bookmarks.json");
const HISTORY_FILE = join(DATA_DIR, "history.json");
const ROUTE = "/embedded-browser";
const BOOKMARK_MAX = 300;
const HISTORY_MAX = 500;
const MAX_BODY = 256 * 1024;

function sendJson(res, code, value) {
	res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
	res.end(JSON.stringify(value));
}

function readJsonBody(req, cap = MAX_BODY) {
	return new Promise((done, fail) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > cap) { fail(new Error("body too large")); req.destroy(); return; }
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (chunks.length === 0) { done({}); return; }
			try { done(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
			catch { fail(new Error("invalid JSON body")); }
		});
		req.on("error", (error) => fail(error));
	});
}

/** 来源校验：只放本机来源，别让外站页面往里塞数据。 */
function originAllowed(req) {
	const origin = req.headers.origin;
	if (typeof origin === "string" && origin.length > 0 && origin !== "null") {
		try {
			const host = new URL(origin).hostname;
			if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") return false;
		} catch { return false; }
	}
	const site = req.headers["sec-fetch-site"];
	if (typeof site === "string" && site.length > 0 && site !== "same-origin" && site !== "none") return false;
	const host = req.headers.host;
	if (typeof host === "string" && host.length > 0) {
		const hostname = host.replace(/^\[/, "").split("]")[0].split(":")[0].toLowerCase();
		if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "::1") return false;
	}
	return true;
}

/** 地址归一化：没协议补 https://，本机/内网补 http://。 */
function normalizeUrl(input) {
	const text = String(input ?? "").trim();
	if (text.length === 0) return "";
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /^about:|^data:|^file:/i.test(text)) return text;
	if (/^localhost(:\d+)?(\/|$)/i.test(text) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(text)) return "http://" + text;
	return "https://" + text;
}

async function readList(file, cap) {
	try {
		const parsed = JSON.parse(await readFile(file, "utf8"));
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item) => item !== null && typeof item.url === "string" && item.url.length > 0).slice(0, cap);
	} catch { return []; }
}

async function writeList(file, items) {
	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(file, JSON.stringify(items, null, "\t"), "utf8");
	return items;
}

async function addBookmark(url, title) {
	const target = normalizeUrl(url);
	if (target.length === 0) throw new Error("网址为空");
	const items = await readList(BOOKMARK_FILE, BOOKMARK_MAX);
	const at = items.findIndex((item) => item.url === target);
	const entry = { url: target, title: String(title ?? "").trim(), at: Date.now() };
	if (at >= 0) items[at] = entry; else items.unshift(entry);
	return writeList(BOOKMARK_FILE, items.slice(0, BOOKMARK_MAX));
}

async function removeBookmark(url) {
	const target = normalizeUrl(url);
	const items = await readList(BOOKMARK_FILE, BOOKMARK_MAX);
	return writeList(BOOKMARK_FILE, items.filter((item) => item.url !== target));
}

/** 记一条历史：同一条连着来只留一条。 */
async function pushHistory(url, title) {
	const target = normalizeUrl(url);
	if (target.length === 0) throw new Error("网址为空");
	const items = await readList(HISTORY_FILE, HISTORY_MAX);
	if (items.length > 0 && items[0].url === target) {
		items[0] = { url: target, title: String(title ?? "").trim() || items[0].title, at: Date.now() };
	} else {
		items.unshift({ url: target, title: String(title ?? "").trim(), at: Date.now() });
	}
	return writeList(HISTORY_FILE, items.slice(0, HISTORY_MAX));
}

const instanceKey = Symbol.for("dsh-embedded-browser/host");

export function apply(ctx) {
	const state = globalThis[instanceKey] ?? (globalThis[instanceKey] = { registered: false });
	if (state.registered === true) return;
	state.registered = true;

	ctx.effect(() => {
		const off = ctx.webServer.register({
			kind: "prefix",
			path: ROUTE,
			handler: async (req, res) => {
				if (!originAllowed(req)) return sendJson(res, 403, { ok: false, error: "forbidden origin" });
				const url = new URL(req.url ?? "/", "http://x");
				const path = url.pathname.slice(ROUTE.length);
				try {
					if (path === "/bookmarks") {
						return sendJson(res, 200, { ok: true, bookmarks: await readList(BOOKMARK_FILE, BOOKMARK_MAX) });
					}
					if (path === "/bookmark") {
						if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "use POST" });
						const body = await readJsonBody(req);
						const action = String(body.action ?? "add");
						if (action === "add") return sendJson(res, 200, { ok: true, bookmarks: await addBookmark(body.url, body.title) });
						if (action === "remove") return sendJson(res, 200, { ok: true, bookmarks: await removeBookmark(body.url) });
						throw new Error("未知动作：" + action);
					}
					if (path === "/history") {
						if (req.method === "POST") {
							const body = await readJsonBody(req);
							return sendJson(res, 200, { ok: true, history: await pushHistory(body.url, body.title) });
						}
						return sendJson(res, 200, { ok: true, history: await readList(HISTORY_FILE, HISTORY_MAX) });
					}
					return sendJson(res, 404, { ok: false, error: "unknown embedded-browser endpoint" });
				} catch (error) {
					return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
		});
		return () => { try { if (typeof off === "function") off(); } catch { /* ignore */ } };
	}, "dsh-embedded-browser: routes");
}

export const __test = { normalizeUrl, originAllowed, readList, addBookmark, removeBookmark, pushHistory, PLUGIN_ROOT, DATA_DIR, ROUTE };
