/*
 * Team storage. Each store maps a normalised team key -> saved spin.
 *
 *   claim(key, entry) -> saves entry only if the key is free; returns
 *                        { entry, created } where entry is what is stored.
 *   get(key), remove(key) -> bool, clear() -> removed count, count()
 */
"use strict";

const fs = require("fs");
const path = require("path");

const HASH = "gtm:teams";

// Redis via the Upstash REST API (what Vercel KV / "Upstash for Redis" provides).
function redisStore(url, token) {
  async function cmd(...args) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new Error(`Redis ${args[0]} failed: ${body.error || res.status}`);
    return body.result;
  }

  return {
    async get(key) {
      const raw = await cmd("HGET", HASH, key);
      return raw ? JSON.parse(raw) : null;
    },
    // HSETNX is atomic, so two devices spinning at once can't both win.
    async claim(key, entry) {
      if (await cmd("HSETNX", HASH, key, JSON.stringify(entry))) return { entry, created: true };
      return { entry: await this.get(key), created: false };
    },
    async remove(key) {
      return (await cmd("HDEL", HASH, key)) > 0;
    },
    async clear() {
      const n = await cmd("HLEN", HASH);
      await cmd("DEL", HASH);
      return n;
    },
    async count() {
      return cmd("HLEN", HASH);
    },
  };
}

// JSON file on disk, for local runs of server.js.
function fileStore(file) {
  let teams;
  try {
    teams = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    teams = {};
  }
  function save() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + ".tmp", JSON.stringify(teams, null, 2));
    fs.renameSync(file + ".tmp", file);
  }

  return {
    async get(key) {
      return teams[key] || null;
    },
    async claim(key, entry) {
      if (teams[key]) return { entry: teams[key], created: false };
      teams[key] = entry;
      try {
        save();
      } catch (e) {
        delete teams[key];
        throw e;
      }
      return { entry, created: true };
    },
    async remove(key) {
      if (!teams[key]) return false;
      delete teams[key];
      save();
      return true;
    },
    async clear() {
      const n = Object.keys(teams).length;
      teams = {};
      save();
      return n;
    },
    async count() {
      return Object.keys(teams).length;
    },
  };
}

// Env vars set by the Vercel KV / Upstash for Redis integration.
function redisFromEnv(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? redisStore(url, token) : null;
}

module.exports = { redisStore, fileStore, redisFromEnv };
