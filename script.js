(function () {
  "use strict";

  // ---------- Decks ----------
  // The server owns the decks and the matching logic. The browser only gets
  // text lists (no categories) for the reel animation.

  let PRODUCTS = [];
  let BUYERS = [];
  let TWISTS = [];

  // "server": spins are made and saved by server.js (one spin per team, any device).
  // "local":  no game server reachable (static hosting). Spins are saved on this
  //           device only, and the page says so.
  let mode = null;
  let localDecks = null;

  const STORAGE_KEYS = {
    team: "gtmRoulette_teamName",
    localResults: "gtmRoulette_localResults",
    hostKey: "gtmRoulette_hostKey",
    testMode: "gtmRoulette_testMode",
  };

  const els = {
    teamSection: document.getElementById("teamSection"),
    teamNameInput: document.getElementById("teamNameInput"),
    saveTeamBtn: document.getElementById("saveTeamBtn"),
    teamBanner: document.getElementById("teamBanner"),
    teamBannerName: document.getElementById("teamBannerName"),
    editTeamBtn: document.getElementById("editTeamBtn"),
    spinBtn: document.getElementById("spinBtn"),
    spinBtnLabel: document.getElementById("spinBtnLabel"),
    lockedNote: document.getElementById("lockedNote"),
    nextSteps: document.getElementById("nextSteps"),
    resetBtn: document.getElementById("resetBtn"),
    productValue: document.getElementById("productValue"),
    buyerValue: document.getElementById("buyerValue"),
    twistValue: document.getElementById("twistValue"),
    modeBanner: document.getElementById("modeBanner"),
    hostPanel: document.getElementById("hostPanel"),
    hostLogin: document.getElementById("hostLogin"),
    hostKeyInput: document.getElementById("hostKeyInput"),
    hostLoginBtn: document.getElementById("hostLoginBtn"),
    hostTools: document.getElementById("hostTools"),
    hostStatus: document.getElementById("hostStatus"),
    testModeBtn: document.getElementById("testModeBtn"),
    resetTeamInput: document.getElementById("resetTeamInput"),
    resetTeamBtn: document.getElementById("resetTeamBtn"),
    resetAllBtn: document.getElementById("resetAllBtn"),
  };

  const wheelCards = {
    product: document.querySelector('.wheel-card[data-cat="product"]'),
    buyer: document.querySelector('.wheel-card[data-cat="buyer"]'),
    twist: document.querySelector('.wheel-card[data-cat="twist"]'),
  };

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Same rule as the server: case-insensitive, ignores leading/trailing whitespace.
  function teamKey(name) {
    return name.normalize("NFKC").trim().toLowerCase();
  }

  // Storage can throw (private mode, blocked site data); never let it break the game.
  function store(area, key, value) {
    try {
      if (value === null) area.removeItem(key);
      else area.setItem(key, value);
    } catch (e) {}
  }
  function load(area, key) {
    try {
      return area.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function getTeamName() {
    return load(localStorage, STORAGE_KEYS.team) || "";
  }

  // The current team's saved result (from the server, or this device in local mode).
  let currentResult = null;

  function isLocked() {
    return !!currentResult;
  }

  function getHostKey() {
    return load(sessionStorage, STORAGE_KEYS.hostKey) || "";
  }

  function isTestMode() {
    return load(sessionStorage, STORAGE_KEYS.testMode) === "1";
  }

  // ---------- Server / local backends ----------

  async function api(path, options) {
    const opts = Object.assign({ headers: {} }, options);
    opts.headers["Content-Type"] = "application/json";
    const key = getHostKey();
    if (key) opts.headers["X-Host-Key"] = key;
    const res = await fetch("api/" + path, opts);
    let body = null;
    try {
      body = await res.json();
    } catch (e) {}
    if (!res.ok) throw new Error((body && body.error) || "Something went wrong. Try again.");
    return body;
  }

  function getLocalResults() {
    try {
      return JSON.parse(load(localStorage, STORAGE_KEYS.localResults)) || {};
    } catch (e) {
      return {};
    }
  }

  function setLocalResults(results) {
    store(localStorage, STORAGE_KEYS.localResults, JSON.stringify(results));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  }

  async function detectMode() {
    try {
      const d = await api("decks");
      PRODUCTS = d.products;
      BUYERS = d.buyers;
      TWISTS = d.twists;
      mode = "server";
    } catch (e) {
      await loadScript("decks.js");
      localDecks = window.GTM_DECKS;
      const d = localDecks.publicDecks();
      PRODUCTS = d.products;
      BUYERS = d.buyers;
      TWISTS = d.twists;
      mode = "local";
    }
  }

  async function lookupTeam(name) {
    if (mode === "server") {
      const r = await api("team?name=" + encodeURIComponent(name));
      return r.spun ? r.result : null;
    }
    return getLocalResults()[teamKey(name)] || null;
  }

  // Returns { result, alreadySpun }.
  async function requestSpin(name, test) {
    if (mode === "server") {
      return api("spin", { method: "POST", body: JSON.stringify(test ? { test: true } : { teamName: name }) });
    }
    if (test) return { result: localDecks.spin(), alreadySpun: false };
    const results = getLocalResults();
    const key = teamKey(name);
    if (results[key]) return { result: results[key], alreadySpun: true };
    const result = Object.assign({ teamName: name }, localDecks.spin());
    results[key] = result;
    setLocalResults(results);
    return { result, alreadySpun: false };
  }

  // ---------- UI rendering ----------

  function renderModeBanner() {
    els.modeBanner.classList.remove("test");
    if (isTestMode()) {
      els.modeBanner.textContent = "🧪 HOST TEST MODE — spins are not saved and don't use up any team's spin.";
      els.modeBanner.classList.add("test");
      els.modeBanner.classList.remove("hidden");
    } else if (mode === "local") {
      els.modeBanner.textContent = "⚠ Game server not connected. Spins are saved on this device only, so one spin per team can't be enforced across devices.";
      els.modeBanner.classList.remove("hidden");
    } else {
      els.modeBanner.classList.add("hidden");
    }
  }

  function clearWheels() {
    els.productValue.textContent = "???";
    els.buyerValue.textContent = "???";
    els.twistValue.textContent = "???";
    Object.values(wheelCards).forEach((c) => c.classList.remove("settled", "spinning"));
    els.spinBtnLabel.textContent = "🎲 SPIN THE ROULETTE";
    els.lockedNote.classList.add("hidden");
    els.nextSteps.classList.add("hidden");
  }

  function renderTeamUI() {
    if (isTestMode()) {
      els.teamSection.classList.add("hidden");
      els.teamBanner.classList.add("hidden");
      els.spinBtn.disabled = spinning;
      return;
    }
    const name = getTeamName();
    if (name) {
      els.teamSection.classList.add("hidden");
      els.teamBanner.classList.remove("hidden");
      els.teamBannerName.textContent = name;
      els.spinBtn.disabled = isLocked() || !mode;
    } else {
      els.teamSection.classList.remove("hidden");
      els.teamBanner.classList.add("hidden");
      els.spinBtn.disabled = true;
    }
  }

  function renderLockedResult() {
    const result = currentResult;
    if (!result) return;
    els.productValue.textContent = result.product;
    els.buyerValue.textContent = result.buyer;
    els.twistValue.textContent = result.twist;
    Object.values(wheelCards).forEach((c) => c.classList.add("settled"));

    els.spinBtn.disabled = true;
    els.spinBtnLabel.textContent = "🔒 ALREADY SPUN";
    els.lockedNote.classList.remove("hidden");
    els.nextSteps.classList.remove("hidden");
  }

  // ---------- Confetti ----------

  function launchConfetti() {
    const colors = ["#D2FF4D", "#FF5A5F", "#3E6BFF", "#14120F", "#FFFFFF"];
    const count = 46;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      const color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.background = color;
      piece.style.left = Math.random() * 100 + "vw";
      const duration = 1600 + Math.random() * 900;
      const rotateStart = Math.random() * 360;
      const drift = (Math.random() - 0.5) * 160;
      piece.style.transform = `rotate(${rotateStart}deg)`;
      piece.style.animation = `confettiFall ${duration}ms ease-in forwards`;
      piece.style.setProperty("--drift", drift + "px");
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), duration + 100);
    }
  }

  // inject confetti keyframes once
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    @keyframes confettiFall{
      0%{ transform: translate(0,0) rotate(0deg); opacity:1; }
      100%{ transform: translate(var(--drift), 100vh) rotate(600deg); opacity:0.9; }
    }
  `;
  document.head.appendChild(styleTag);

  // ---------- Spin animation ----------

  let spinning = false;

  function spinReel(el, cardEl, list, durationMs, finalValue) {
    return new Promise((resolve) => {
      cardEl.classList.add("spinning");
      const start = performance.now();
      let lastSwap = 0;

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / durationMs, 1);
        const swapInterval = 50 + Math.pow(progress, 3) * 300;

        if (now - lastSwap > swapInterval) {
          el.textContent = pickRandom(list);
          lastSwap = now;
        }

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = finalValue;
          cardEl.classList.remove("spinning");
          cardEl.classList.add("settled");
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  async function doSpin() {
    const test = isTestMode();
    const name = getTeamName();
    if (spinning || !mode || (!test && (isLocked() || !name))) return;
    spinning = true;
    els.spinBtn.disabled = true;
    els.spinBtnLabel.textContent = "🎰 SPINNING...";
    els.lockedNote.classList.add("hidden");
    els.nextSteps.classList.add("hidden");

    Object.values(wheelCards).forEach((c) => c.classList.remove("settled"));

    let response;
    try {
      response = await requestSpin(name, test);
    } catch (e) {
      spinning = false;
      els.spinBtnLabel.textContent = "🎲 SPIN THE ROULETTE";
      renderTeamUI();
      alert(e.message || "Couldn't reach the game. Check your connection and try again.");
      return;
    }

    const result = response.result;

    // Another device already spun for this team: show the saved combination, no re-spin.
    if (response.alreadySpun) {
      spinning = false;
      currentResult = result;
      renderLockedResult();
      alert(`"${result.teamName}" has already spun. Here's your team's combination.`);
      return;
    }

    await Promise.all([
      spinReel(els.productValue, wheelCards.product, PRODUCTS, 1400, result.product),
      spinReel(els.buyerValue, wheelCards.buyer, BUYERS, 1900, result.buyer),
      spinReel(els.twistValue, wheelCards.twist, TWISTS, 2400, result.twist),
    ]);

    spinning = false;
    launchConfetti();

    if (test) {
      els.spinBtnLabel.textContent = "🧪 TEST SPIN AGAIN";
      els.spinBtn.disabled = false;
      return;
    }

    currentResult = result;
    els.spinBtnLabel.textContent = "🔒 ALREADY SPUN";
    els.lockedNote.classList.remove("hidden");
    els.nextSteps.classList.remove("hidden");
    els.nextSteps.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Load the saved team (if any) and show its original combination.
  async function restoreTeam() {
    currentResult = null;
    clearWheels();
    const name = getTeamName();
    if (name && !isTestMode()) {
      try {
        currentResult = await lookupTeam(name);
      } catch (e) {
        alert(e.message);
      }
    }
    renderTeamUI();
    if (currentResult && !isTestMode()) renderLockedResult();
  }

  // ---------- Event wiring ----------

  els.saveTeamBtn.addEventListener("click", async () => {
    const name = els.teamNameInput.value.trim();
    if (!name) {
      els.teamNameInput.focus();
      els.teamNameInput.classList.add("shake");
      setTimeout(() => els.teamNameInput.classList.remove("shake"), 500);
      return;
    }
    if (!mode) return;
    store(localStorage, STORAGE_KEYS.team, name);
    await restoreTeam();
  });

  els.teamNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.saveTeamBtn.click();
  });

  els.editTeamBtn.addEventListener("click", () => {
    if (isLocked()) {
      alert("This team has already spun and is locked in. You can only edit the team name before spinning.");
      return;
    }
    els.teamNameInput.value = getTeamName();
    els.teamSection.classList.remove("hidden");
    els.teamBanner.classList.add("hidden");
    els.teamNameInput.focus();
  });

  els.spinBtn.addEventListener("click", doSpin);

  els.resetBtn.addEventListener("click", () => {
    const msg = mode === "server"
      ? "Switch this device to a new team? Spins already made stay locked to their team."
      : "Reset this device for a new team? This clears the current team's name on THIS phone only.";
    if (!confirm(msg)) return;
    store(localStorage, STORAGE_KEYS.team, null);
    els.teamNameInput.value = "";
    currentResult = null;
    clearWheels();
    renderTeamUI();
  });

  // ---------- Host controls (open the page with ?host) ----------

  function renderHostPanel(status) {
    const unlocked = mode === "local" || !!getHostKey();
    els.hostLogin.classList.toggle("hidden", unlocked);
    els.hostTools.classList.toggle("hidden", !unlocked);
    els.testModeBtn.textContent = isTestMode() ? "Exit test mode" : "Start test mode";
    if (status !== undefined) els.hostStatus.textContent = status;
  }

  async function hostUnlock(key) {
    store(sessionStorage, STORAGE_KEYS.hostKey, key);
    try {
      const r = await api("host/verify");
      renderHostPanel(`Unlocked. ${r.teamCount} team(s) have spun.`);
    } catch (e) {
      store(sessionStorage, STORAGE_KEYS.hostKey, null);
      renderHostPanel();
      alert(e.message);
    }
  }

  els.hostLoginBtn.addEventListener("click", () => {
    const key = els.hostKeyInput.value.trim();
    if (key) hostUnlock(key);
  });

  els.hostKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.hostLoginBtn.click();
  });

  els.testModeBtn.addEventListener("click", async () => {
    if (spinning) return;
    store(sessionStorage, STORAGE_KEYS.testMode, isTestMode() ? null : "1");
    renderModeBanner();
    renderHostPanel();
    await restoreTeam();
  });

  els.resetTeamBtn.addEventListener("click", async () => {
    const name = els.resetTeamInput.value.trim();
    if (!name) return;
    if (!confirm(`Reset "${name}"? Their saved spin is deleted and they can spin again.`)) return;
    try {
      if (mode === "server") {
        await api("host/reset-team", { method: "POST", body: JSON.stringify({ teamName: name }) });
      } else {
        const results = getLocalResults();
        if (!results[teamKey(name)]) throw new Error(`No saved spin for "${name}" on this device.`);
        delete results[teamKey(name)];
        setLocalResults(results);
      }
      els.resetTeamInput.value = "";
      renderHostPanel(`"${name}" was reset and can spin again.`);
      if (getTeamName() && teamKey(getTeamName()) === teamKey(name)) await restoreTeam();
    } catch (e) {
      alert(e.message);
    }
  });

  els.resetAllBtn.addEventListener("click", async () => {
    if (!confirm("Delete EVERY team's saved spin? Everyone will be able to spin again.")) return;
    if (prompt('Type RESET to confirm.') !== "RESET") return;
    try {
      if (mode === "server") {
        const r = await api("host/reset-all", { method: "POST" });
        renderHostPanel(`All teams reset (${r.removedCount} removed).`);
      } else {
        setLocalResults({});
        renderHostPanel("All teams reset on this device.");
      }
      await restoreTeam();
    } catch (e) {
      alert(e.message);
    }
  });

  // ---------- Init ----------

  (async function init() {
    renderTeamUI();
    await detectMode();
    renderModeBanner();
    if (new URLSearchParams(location.search).has("host")) {
      els.hostPanel.classList.remove("hidden");
      renderHostPanel(mode === "local" ? "Device-only mode: resets and test spins affect this device only." : "");
      if (mode === "server" && getHostKey()) hostUnlock(getHostKey());
    } else if (isTestMode()) {
      // Test mode only lives on the host page.
      store(sessionStorage, STORAGE_KEYS.testMode, null);
      renderModeBanner();
    }
    await restoreTeam();
  })();
})();
