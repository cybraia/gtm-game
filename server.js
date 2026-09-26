/*
 * GTM Roulette game server — zero dependencies (Node 18+).
 *
 *   HOST_KEY=some-secret node server.js
 *
 * - Serves the static page (index.html, styles.css, script.js).
 * - Runs every spin server-side and saves it against the team name, so a team
 *   gets one spin no matter which device it uses.
 * - Stores teams in a JSON file (DATA_FILE, default ./data/teams.json). The
 *   host must run this on a machine/host with a persistent disk.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const decks = require("./decks");

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, "data", "teams.json"));
const MAX_TEAM_NAME = 30;

let HOST_KEY = process.env.HOST_KEY || "";
if (!HOST_KEY) {
  HOST_KEY = crypto.randomBytes(6).toString("hex");
  console.warn(`[gtm] HOST_KEY not set. Generated one for this run: ${HOST_KEY}`);
}

// Only these files are public. decks.js (categories) and data/ are never served.
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "application/javascript; charset=utf-8"],
};

// ---------- Storage ----------

function loadTeams() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw e;
  }
}

let teams = loadTeams();

function saveTeams() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(teams, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

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

// ---------- HTTP helpers ----------

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 10000) {
        reject(new Error("too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function isHost(req) {
  const given = Buffer.from(String(req.headers["x-host-key"] || ""));
  const expected = Buffer.from(HOST_KEY);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// ---------- Routes ----------

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;

  if (route === "GET /api/decks") {
    return send(res, 200, decks.publicDecks());
  }

  if (route === "GET /api/team") {
    const name = cleanName(url.searchParams.get("name"));
    if (!name) return send(res, 400, { error: "Team name required." });
    const entry = teams[teamKey(name)];
    return send(res, 200, entry ? { spun: true, result: publicEntry(entry) } : { spun: false });
  }

  if (route === "POST /api/spin") {
    const body = await readJson(req);

    // Host test spin: never saved, never consumes a team entry.
    if (body.test) {
      if (!isHost(req)) return send(res, 403, { error: "Host key required for test spins." });
      return send(res, 200, { test: true, result: decks.spin() });
    }

    const name = cleanName(body.teamName);
    if (!name) return send(res, 400, { error: "Team name required." });
    const key = teamKey(name);
    if (teams[key]) {
      return send(res, 200, { alreadySpun: true, result: publicEntry(teams[key]) });
    }
    const entry = Object.assign({ teamName: name }, decks.spin(), { spunAt: new Date().toISOString() });
    teams[key] = entry;
    try {
      saveTeams();
    } catch (e) {
      delete teams[key];
      console.error("[gtm] Failed to save teams:", e);
      return send(res, 500, { error: "Could not save your spin. Tell the host." });
    }
    return send(res, 200, { alreadySpun: false, result: publicEntry(entry) });
  }

  if (url.pathname.startsWith("/api/host/")) {
    if (!isHost(req)) return send(res, 403, { error: "Wrong host key." });

    if (route === "GET /api/host/verify") {
      return send(res, 200, { ok: true, teamCount: Object.keys(teams).length });
    }

    if (route === "POST /api/host/reset-team") {
      const body = await readJson(req);
      const name = cleanName(body.teamName);
      if (!name) return send(res, 400, { error: "Team name required." });
      const key = teamKey(name);
      if (!teams[key]) return send(res, 404, { error: `No saved spin for "${name}".` });
      const removed = teams[key];
      delete teams[key];
      saveTeams();
      return send(res, 200, { ok: true, removed: removed.teamName });
    }

    if (route === "POST /api/host/reset-all") {
      const count = Object.keys(teams).length;
      teams = {};
      saveTeams();
      return send(res, 200, { ok: true, removedCount: count });
    }
  }

  return send(res, 404, { error: "Not found." });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);

    const file = req.method === "GET" || req.method === "HEAD" ? STATIC[url.pathname] : null;
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    fs.readFile(path.join(__dirname, file[0]), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end();
      }
      res.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-cache" });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  } catch (e) {
    send(res, 400, { error: "Bad request." });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[gtm] GTM Roulette running on http://localhost:${PORT}  (data: ${DATA_FILE})`);
  });
}

module.exports = { server };
