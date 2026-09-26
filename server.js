/*
 * Local dev server for GTM Roulette — zero dependencies (Node 18+).
 *
 *   HOST_KEY=some-secret node server.js
 *
 * Serves public/ and the same /api/* routes as the Vercel functions. Uses
 * Vercel KV / Upstash Redis if its env vars are set, otherwise a JSON file
 * (DATA_FILE, default ./data/teams.json).
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createHandler } = require("./lib/game");
const { redisFromEnv, fileStore } = require("./lib/stores");

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, "data", "teams.json"));

let HOST_KEY = process.env.HOST_KEY || "";
if (!HOST_KEY) {
  HOST_KEY = crypto.randomBytes(6).toString("hex");
  console.warn(`[gtm] HOST_KEY not set. Generated one for this run: ${HOST_KEY}`);
}

const redis = redisFromEnv(process.env);
const handle = createHandler({ store: redis || fileStore(DATA_FILE), hostKey: HOST_KEY });

// Only these files are public. lib/ (decks + categories) and data/ are never served.
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "application/javascript; charset=utf-8"],
};

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname.startsWith("/api/")) return handle(req, res, pathname.slice(5));

  const file = req.method === "GET" || req.method === "HEAD" ? STATIC[pathname] : null;
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  fs.readFile(path.join(__dirname, "public", file[0]), (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end();
    }
    res.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : data);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[gtm] GTM Roulette on http://localhost:${PORT}  (storage: ${redis ? "Redis" : DATA_FILE})`);
  });
}

module.exports = { server };
