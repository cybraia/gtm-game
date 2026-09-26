/*
 * GTM Roulette API, shared by the Vercel functions (api/) and server.js.
 *
 *   GET  /api/decks                 text-only lists for the reel animation
 *   GET  /api/team?name=            a team's saved spin, if any
 *   POST /api/spin {teamName}       one spin per team; returns the saved one after that
 *   POST /api/spin {test:true}      host test spin, never saved (X-Host-Key)
 *   GET  /api/host/verify           host key check + team count (X-Host-Key)
 *   POST /api/host/reset-team       {teamName} (X-Host-Key)
 *   POST /api/host/reset-all        (X-Host-Key)
 */
"use strict";

const crypto = require("crypto");
const decks = require("./decks");

const MAX_TEAM_NAME = 30;

// Case-insensitive, ignores leading/trailing whitespace.
function teamKey(name) {
  return name.normalize("NFKC").trim().toLowerCase();
}

function cleanName(name) {
  if (typeof name !== "string") return "";
  return name.normalize("NFKC").trim().slice(0, MAX_TEAM_NAME);
}

function publicEntry(entry) {
  return { teamName: entry.teamName, product: entry.product, buyer: entry.buyer, twist: entry.twist, spunAt: entry.spunAt };
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  // Vercel pre-parses the body; plain Node needs the stream read.
  if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 10000) throw new Error("too large");
  }
  return data ? JSON.parse(data) : {};
}

// store: see lib/stores.js (null = storage not configured). hostKey: "" = host tools disabled.
function createHandler({ store, hostKey }) {
  function isHost(req) {
    if (!hostKey) return false;
    const given = Buffer.from(String(req.headers["x-host-key"] || ""));
    const expected = Buffer.from(hostKey);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  }

  const noStore = (res) => send(res, 503, { error: "Game storage isn't set up yet. Tell the host." });

  const routes = {
    "GET decks": async (req, res) => send(res, 200, Object.assign(decks.publicDecks(), { ready: !!store })),

    "GET team": async (req, res, url) => {
      if (!store) return noStore(res);
      const name = cleanName(url.searchParams.get("name"));
      if (!name) return send(res, 400, { error: "Team name required." });
      const entry = await store.get(teamKey(name));
      return send(res, 200, entry ? { spun: true, result: publicEntry(entry) } : { spun: false });
    },

    "POST spin": async (req, res) => {
      const body = await readJson(req);

      // Host test spin: never saved, never consumes a team entry.
      if (body.test) {
        if (!isHost(req)) return send(res, 403, { error: "Host key required for test spins." });
        return send(res, 200, { test: true, result: decks.spin() });
      }

      if (!store) return noStore(res);
      const name = cleanName(body.teamName);
      if (!name) return send(res, 400, { error: "Team name required." });
      const fresh = Object.assign({ teamName: name }, decks.spin(), { spunAt: new Date().toISOString() });
      const { entry, created } = await store.claim(teamKey(name), fresh);
      return send(res, 200, { alreadySpun: !created, result: publicEntry(entry) });
    },

    // Works without storage so the host can use test mode before the store is connected.
    "GET host/verify": async (req, res) => send(res, 200, { ok: true, teamCount: store ? await store.count() : null }),

    "POST host/reset-team": async (req, res) => {
      if (!store) return noStore(res);
      const name = cleanName((await readJson(req)).teamName);
      if (!name) return send(res, 400, { error: "Team name required." });
      if (!(await store.remove(teamKey(name)))) return send(res, 404, { error: `No saved spin for "${name}".` });
      return send(res, 200, { ok: true });
    },

    "POST host/reset-all": async (req, res) => {
      if (!store) return noStore(res);
      return send(res, 200, { ok: true, removedCount: await store.clear() });
    },
  };

  // route: path after /api/, e.g. "spin" or "host/verify".
  return async function handle(req, res, route) {
    const url = new URL(req.url, "http://localhost");
    const fn = routes[`${req.method} ${route}`];
    if (!fn) return send(res, 404, { error: "Not found." });
    if (route.startsWith("host/")) {
      if (!hostKey) return send(res, 503, { error: "HOST_KEY isn't set on the server." });
      if (!isHost(req)) return send(res, 403, { error: "Wrong host key." });
    }
    try {
      await fn(req, res, url);
    } catch (e) {
      console.error(`[gtm] ${route} failed:`, e);
      send(res, 500, { error: "Something went wrong saving the game. Tell the host." });
    }
  };
}

module.exports = { createHandler, teamKey };
