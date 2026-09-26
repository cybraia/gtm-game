"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const http = require("http");

const decks = require("../public/decks");
const { createHandler } = require("../lib/game");
const { redisStore, fileStore } = require("../lib/stores");

test("decks have the expected sizes and every product has a compatible buyer", () => {
  assert.strictEqual(decks.PRODUCTS.length, 32);
  assert.strictEqual(decks.BUYERS.length, 30);
  assert.strictEqual(decks.TWISTS.length, 30);
  for (const p of decks.PRODUCTS) assert.ok(decks.compatibleBuyers(p).length > 0, p.text);
});

test("50 random spins: product and buyer always share a category", () => {
  for (let i = 0; i < 50; i++) {
    const r = decks.spin();
    const product = decks.PRODUCTS.find((p) => p.text === r.product);
    const buyer = decks.BUYERS.find((b) => b.text === r.buyer);
    assert.ok(product && buyer && decks.TWISTS.includes(r.twist));
    assert.ok(buyer.cats.some((c) => product.cats.includes(c)), `${r.product} -> ${r.buyer}`);
  }
});

test("twists are unrestricted: every twist appears with every product category", () => {
  const seen = new Map();
  for (let i = 0; i < 20000; i++) {
    const r = decks.spin();
    const cat = decks.PRODUCTS.find((p) => p.text === r.product).cats[0];
    if (!seen.has(r.twist)) seen.set(r.twist, new Set());
    seen.get(r.twist).add(cat);
  }
  assert.strictEqual(seen.size, decks.TWISTS.length);
  for (const cats of seen.values()) assert.strictEqual(cats.size, 6);
});

test("public decks never carry categories", () => {
  const pub = JSON.stringify(decks.publicDecks());
  for (const c of ["HR", "Operations", "Sales", "Finance", "Productivity", "Marketing"]) {
    assert.ok(!pub.includes(`"${c}"`));
  }
});

// Runs the full team/host flow against a base URL.
async function teamFlow(base, hostKey) {
  const call = async (p, body, key) => {
    const headers = { "Content-Type": "application/json" };
    if (key) headers["X-Host-Key"] = key;
    const res = await fetch(base + p, body === undefined ? { headers } : { method: "POST", headers, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const d = (await call("/api/decks")).body;
  assert.strictEqual(d.ready, true);
  assert.ok(!JSON.stringify(d).includes('"cats"'));

  // Team name required.
  assert.strictEqual((await call("/api/spin", { teamName: "   " })).status, 400);

  // First spin saves; variants of the same name return the original combination.
  const first = await call("/api/spin", { teamName: "  Chaos Coalition " });
  assert.strictEqual(first.status, 200);
  assert.strictEqual(first.body.alreadySpun, false);
  assert.strictEqual(first.body.result.teamName, "Chaos Coalition");
  for (const variant of ["chaos coalition", "CHAOS COALITION", "\tChaos Coalition\n"]) {
    const again = await call("/api/spin", { teamName: variant });
    assert.strictEqual(again.body.alreadySpun, true);
    assert.deepStrictEqual(again.body.result, first.body.result);
  }
  const lookup = await call("/api/team?name=" + encodeURIComponent(" CHAOS coalition"));
  assert.deepStrictEqual(lookup.body, { spun: true, result: first.body.result });
  assert.deepStrictEqual((await call("/api/team?name=Nobody")).body, { spun: false });

  // Simultaneous spins from different devices all get the same saved combination.
  const racers = await Promise.all([1, 2, 3, 4, 5].map(() => call("/api/spin", { teamName: "Race Team" })));
  assert.strictEqual(racers.filter((r) => !r.body.alreadySpun).length, 1);
  for (const r of racers) assert.deepStrictEqual(r.body.result, racers[0].body.result);

  // Test spins need the host key and never consume entries.
  assert.strictEqual((await call("/api/spin", { test: true })).status, 403);
  assert.strictEqual((await call("/api/spin", { test: true }, "wrong")).status, 403);
  for (let i = 0; i < 5; i++) {
    const r = await call("/api/spin", { test: true, teamName: "Test Team" }, hostKey);
    assert.strictEqual(r.body.test, true);
  }
  assert.deepStrictEqual((await call("/api/team?name=Test%20Team")).body, { spun: false });
  assert.strictEqual((await call("/api/host/verify", undefined, hostKey)).body.teamCount, 2);

  // Host reset flow.
  assert.strictEqual((await call("/api/host/reset-team", { teamName: "chaos coalition" })).status, 403);
  assert.strictEqual((await call("/api/host/reset-team", { teamName: "CHAOS COALITION " }, hostKey)).status, 200);
  assert.deepStrictEqual((await call("/api/team?name=Chaos%20Coalition")).body, { spun: false });
  assert.strictEqual((await call("/api/host/reset-team", { teamName: "Chaos Coalition" }, hostKey)).status, 404);
  const respin = await call("/api/spin", { teamName: "Chaos Coalition" });
  assert.strictEqual(respin.body.alreadySpun, false);
  const all = await call("/api/host/reset-all", {}, hostKey);
  assert.strictEqual(all.body.removedCount, 2);
  assert.strictEqual((await call("/api/host/verify", undefined, hostKey)).body.teamCount, 0);
}

function listen(server) {
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${server.address().port}`)));
}

// Minimal fake of the Upstash REST API (the commands lib/stores.js uses).
function fakeUpstash(token) {
  const hashes = new Map();
  const calls = [];
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: "Unauthorized" }));
      }
      const [cmd, key, field, value] = JSON.parse(data);
      calls.push(cmd);
      const h = hashes.get(key) || new Map();
      hashes.set(key, h);
      let result;
      if (cmd === "HGET") result = h.has(field) ? h.get(field) : null;
      else if (cmd === "HSETNX") result = h.has(field) ? 0 : (h.set(field, value), 1);
      else if (cmd === "HDEL") result = h.delete(field) ? 1 : 0;
      else if (cmd === "HLEN") result = h.size;
      else if (cmd === "DEL") result = hashes.delete(key) ? 1 : 0;
      else return res.end(JSON.stringify({ error: "unknown command " + cmd }));
      res.end(JSON.stringify({ result }));
    });
  });
  return { server, calls };
}

test("local server with file store: static files, team flow, persistence", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gtm-"));
  process.env.DATA_FILE = path.join(dir, "teams.json");
  process.env.HOST_KEY = "host-secret";
  delete process.env.KV_REST_API_URL;
  delete require.cache[require.resolve("../server")];
  const { server } = require("../server");
  const base = await listen(server);
  t.after(() => server.close());

  assert.strictEqual((await fetch(base + "/")).status, 200);
  assert.strictEqual((await fetch(base + "/script.js")).status, 200);
  for (const p of ["/lib/game.js", "/server.js", "/data/teams.json", "/package.json", "/../server.js"]) {
    assert.strictEqual((await fetch(base + p)).status, 404, p);
  }
  await teamFlow(base, "host-secret");
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(process.env.DATA_FILE, "utf8")), {});
});

test("Vercel functions with KV (Upstash REST) store", async (t) => {
  const kv = fakeUpstash("kv-token");
  const kvUrl = await listen(kv.server);
  t.after(() => kv.server.close());

  // Load the real api/ entry points with Vercel's env vars.
  process.env.KV_REST_API_URL = kvUrl;
  process.env.KV_REST_API_TOKEN = "kv-token";
  process.env.HOST_KEY = "vercel-host";
  for (const k of Object.keys(require.cache)) if (k.includes(`${path.sep}api${path.sep}`) || k.endsWith("vercel.js")) delete require.cache[k];
  const root = path.join(__dirname, "..");
  const fns = {};
  for (const f of ["decks", "team", "spin", "host/verify", "host/reset-team", "host/reset-all"]) fns[f] = require(path.join(root, "api", f + ".js"));

  // Route like Vercel does (file per path) and pre-parse the JSON body like Vercel's helpers.
  const vercel = http.createServer(async (req, res) => {
    const route = new URL(req.url, "http://x").pathname.replace(/^\/api\//, "");
    if (!fns[route]) {
      res.writeHead(404);
      return res.end();
    }
    let data = "";
    for await (const c of req) data += c;
    req.body = data ? JSON.parse(data) : undefined;
    fns[route](req, res);
  });
  const base = await listen(vercel);
  t.after(() => vercel.close());

  await teamFlow(base, "vercel-host");
  assert.ok(kv.calls.includes("HSETNX"));
});

test("without storage configured: decks load, spins refused, host test mode still works", async (t) => {
  const handle = createHandler({ store: null, hostKey: "k" });
  const server = http.createServer((req, res) => handle(req, res, new URL(req.url, "http://x").pathname.slice(5)));
  const base = await listen(server);
  t.after(() => server.close());
  const post = (p, body, key) =>
    fetch(base + p, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, key ? { "X-Host-Key": key } : {}), body: JSON.stringify(body) });

  assert.strictEqual((await (await fetch(base + "/api/decks")).json()).ready, false);
  assert.strictEqual((await post("/api/spin", { teamName: "A" })).status, 503);
  assert.strictEqual((await fetch(base + "/api/team?name=A")).status, 503);
  assert.strictEqual((await (await fetch(base + "/api/host/verify", { headers: { "X-Host-Key": "k" } })).json()).teamCount, null);
  assert.strictEqual((await post("/api/spin", { test: true }, "k")).status, 200);
});

test("Redis store surfaces auth errors instead of pretending to save", async (t) => {
  const kv = fakeUpstash("right");
  const url = await listen(kv.server);
  t.after(() => kv.server.close());
  await assert.rejects(redisStore(url, "wrong").claim("x", { teamName: "x" }), /HSETNX failed/);
});

test("file store keeps data across restarts", async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gtm-")), "t.json");
  await fileStore(file).claim("a", { teamName: "A" });
  assert.deepStrictEqual(await fileStore(file).get("a"), { teamName: "A" });
});
