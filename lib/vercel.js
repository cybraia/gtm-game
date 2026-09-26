// Shared handler for the Vercel functions in api/, backed by Vercel KV (Upstash Redis).
"use strict";

const { createHandler } = require("./game");
const { redisFromEnv } = require("./stores");

const handle = createHandler({ store: redisFromEnv(process.env), hostKey: process.env.HOST_KEY || "" });

module.exports = (route) => (req, res) => handle(req, res, route);
