"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const decks = require("../decks");

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

test("server: registration, duplicates, returning teams, test mode, host reset", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gtm-"));
  process.env.DATA_FILE = path.join(dir, "teams.json");
  process.env.HOST_KEY = "host-secret";
  delete require.cache[require.resolve("../server")];
  const { server } = require("../server");
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (p, body, key) => {
    const headers = { "Content-Type": "application/json" };
    if (key) headers["X-Host-Key"] = key;
    const res = await fetch(base + p, body === undefined ? { headers } : { method: "POST", headers, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  // Static files served; internals are not.
  assert.strictEqual((await fetch(base + "/")).status, 200);
  assert.strictEqual((await fetch(base + "/script.js")).status, 200);
  for (const p of ["/decks.js", "/server.js", "/data/teams.json", "/package.json", "/../decks.js"]) {
    assert.strictEqual((await fetch(base + p)).status, 404, p);
  }
  assert.ok(!JSON.stringify((await call("/api/decks")).body).includes('"cats"'));

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

  // Persisted to disk.
  assert.ok(JSON.parse(fs.readFileSync(process.env.DATA_FILE, "utf8"))["chaos coalition"]);

  // Test spins need the host key and never consume entries.
  assert.strictEqual((await call("/api/spin", { test: true })).status, 403);
  assert.strictEqual((await call("/api/spin", { test: true }, "wrong")).status, 403);
  for (let i = 0; i < 5; i++) {
    const r = await call("/api/spin", { test: true, teamName: "Test Team" }, "host-secret");
    assert.strictEqual(r.body.test, true);
  }
  assert.deepStrictEqual((await call("/api/team?name=Test%20Team")).body, { spun: false });
  assert.strictEqual((await call("/api/host/verify", undefined, "host-secret")).body.teamCount, 1);

  // Host reset flow.
  assert.strictEqual((await call("/api/host/reset-team", { teamName: "chaos coalition" })).status, 403);
  assert.strictEqual((await call("/api/host/reset-team", { teamName: "CHAOS COALITION " }, "host-secret")).status, 200);
  assert.deepStrictEqual((await call("/api/team?name=Chaos%20Coalition")).body, { spun: false });
  assert.strictEqual((await call("/api/host/reset-team", { teamName: "Chaos Coalition" }, "host-secret")).status, 404);
  const respin = await call("/api/spin", { teamName: "Chaos Coalition" });
  assert.strictEqual(respin.body.alreadySpun, false);
  await call("/api/spin", { teamName: "Team Two" });
  const all = await call("/api/host/reset-all", {}, "host-secret");
  assert.strictEqual(all.body.removedCount, 2);
  assert.strictEqual((await call("/api/host/verify", undefined, "host-secret")).body.teamCount, 0);
});
