// 离线自检：不起浏览器、不联网、不落盘。覆盖纯函数（地址归一化 / 来源校验）与路由分支。
import http from 'node:http';
import assert from 'node:assert/strict';
import { apply, __test } from '../lib/index.js';

let passed = 0;
async function check(name, fn) {
	await fn();
	passed += 1;
	console.log('  ok  ' + name);
}

await check('normalizeUrl 补全协议', () => {
	assert.equal(__test.normalizeUrl('example.com'), 'https://example.com');
	assert.equal(__test.normalizeUrl('  example.com/a?b=1 '), 'https://example.com/a?b=1');
	assert.equal(__test.normalizeUrl('http://example.com/x'), 'http://example.com/x');
	assert.equal(__test.normalizeUrl('localhost:3080'), 'http://localhost:3080');
	assert.equal(__test.normalizeUrl('127.0.0.1:9223/json'), 'http://127.0.0.1:9223/json');
	assert.equal(__test.normalizeUrl('about:blank'), 'about:blank');
	assert.equal(__test.normalizeUrl('   '), '');
});

await check('originAllowed 只放本机', () => {
	assert.equal(__test.originAllowed({ headers: { origin: 'http://127.0.0.1:3080', 'sec-fetch-site': 'same-origin', host: '127.0.0.1:3080' } }), true);
	assert.equal(__test.originAllowed({ headers: { origin: 'http://evil.example.com', 'sec-fetch-site': 'cross-site' } }), false);
	assert.equal(__test.originAllowed({ headers: { host: 'evil.example.com' } }), false);
});

await check('路由：来源校验 / 方法 / 未知端点 / 收藏夹读取', async () => {
	let handler = null;
	const ctx = {
		webServer: { register(options) { handler = options.handler; return () => { handler = null; }; } },
		effect(fn) { const off = fn(); return () => { if (typeof off === 'function') off(); }; }
	};
	apply(ctx);
	assert.equal(typeof handler, 'function');
	const server = http.createServer((req, res) => handler(req, res));
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const base = `http://127.0.0.1:${server.address().port}/embedded-browser`;
	const same = { origin: 'http://127.0.0.1:3080', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };
	try {
		assert.equal((await fetch(base + '/bookmarks', { headers: { origin: 'http://evil.example.com', 'sec-fetch-site': 'cross-site' } })).status, 403);
		assert.equal((await fetch(base + '/bookmarks', { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
		assert.equal((await fetch(base + '/nope', { headers: same })).status, 404);
		assert.equal((await fetch(base + '/bookmark', { headers: same })).status, 405);
		const list = await fetch(base + '/bookmarks', { headers: same });
		assert.equal(list.status, 200);
		const body = await list.json();
		assert.equal(body.ok, true);
		assert.ok(Array.isArray(body.bookmarks));
		const history = await fetch(base + '/history', { headers: same });
		assert.equal(history.status, 200);
		assert.ok(Array.isArray((await history.json()).history));
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});

console.log('offline: ' + passed + ' checks passed');
