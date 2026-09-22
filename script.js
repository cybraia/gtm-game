(function () {
  "use strict";

  // ---------- Content decks (inspired by "Cards Against Startups") ----------

  const PRODUCTS = [
    "AI-powered office chair that files its own HR complaints",
    "Blockchain toaster with a 40-page whitepaper",
    "Subscription box for artisanal paperclips, Series A pending",
    "IoT dog leash with a longer privacy policy than the dog's insurance",
    "NFT marketplace for parking spots nobody owns",
    "Social network exclusively for houseplants, now with read receipts",
    "Uber, but for lawnmowers, minus the lawnmowers",
    "AI chatbot for goldfish with zero customer retention",
    "Smart mirror that judges your outfit and your life choices",
    "Crypto wallet for pigeons, audited by pigeons",
    "VR headset for naps, pitched internally as \"deep work\"",
    "Subscription box for mystery rocks, no refunds, no rocks",
    "AI-generated grocery lists nobody asked for",
    "Blockchain-verified handshakes, still zero customers",
    "Drone delivery for participation trophies",
    "Smart fridge that live-tweets your snacking",
    "AI elevator-music curator with a Series A and no elevators",
    "Wearable that tracks eye rolls during stand-up",
    "Voice assistant for houseplants that mostly just sighs",
    "Robotic pooper-scooper with a public roadmap",
    "Meditation app designed for extroverts",
    "Subscription razor blades for pets, cancelled by the pets",
    "AI-powered napkin folder, enterprise tier",
    "Smart doorbell that never actually opens the door",
    "Gamified tax-filing app with a leaderboard",
    "Peer-to-peer parking-meter sharing, pre-regulation",
    "AI sommelier for gas station wine",
    "Smart umbrella that shows you ads mid-downpour",
    "Wearable posture corrector for cats",
    "Punch-card loyalty app for funerals",
    "AI fortune cookies with dynamic, surge-priced fortunes",
    "Subscription plan for other people's Wi-Fi passwords",
    "Smart trash can that livestreams its own contents",
    "A to-do list on the blockchain, zero items completed",
    "AI life coach for houseplants",
    "Self-driving shopping cart with separation anxiety",
    "Wearable that translates baby cries into Jira tickets",
    "AI small-talk generator for elevators",
    "Subscription box for gently used birthday candles",
    "Smart pillow that reports your dreams to HR",
    "ChatGPT wrapper for wedding vows, white-labeled",
    "Enterprise SaaS for scheduling other SaaS meetings",
    "Vibe-coded firmware for a pacemaker",
    "Blockchain loyalty points that only redeem for jury duty",
    "An AI agent that negotiates your rent via strongly worded emails",
    "A pivot table wearing a product roadmap",
  ];

  const BUYERS = [
    "Hospital administrators who still fax",
    "Kindergarten teachers with zero patience left for pivots",
    "Cruise ship captains between icebergs",
    "Funeral home directors chasing \"growth\"",
    "Prison wardens with an innovation budget",
    "Michelin-star chefs who just discovered SaaS",
    "Long-haul truckers with strong opinions on UX",
    "Off-grid homesteaders shopping on one bar of signal",
    "NASA astronauts filling out an expense report",
    "Professional wrestlers reading the terms of service",
    "Retired librarians who still believe in due diligence",
    "Wedding planners three vendors deep in a crisis",
    "Reformed cult leaders, now \"thought leaders\"",
    "Substitute teachers subbing in as your beta testers",
    "Airport security agents who confiscate your demo unit",
    "Competitive eaters evaluating your unit economics",
    "Golf course groundskeepers with a Series A relative",
    "Submarine crews with famously bad Wi-Fi",
    "Beekeepers who take \"hive mind\" personally",
    "Monastery residents on a vow of no upsells",
    "VCs in between funds, extremely available",
    "DMV employees rating your customer experience",
    "Zoo veterinarians who've seen worse pitches",
    "Air traffic controllers multitasking through your demo",
    "Door-to-door salespeople judging your close",
    "Professional mascots who can't remove the costume for this",
    "Casino pit bosses who spot a bluff instantly",
    "Lighthouse keepers, your only repeat customers",
    "Volunteer firefighters who show up anyway",
    "HOA presidents with a laminator and a grudge",
    "Crossing guards blocking your go-to-market",
    "Competitive cheese connoisseurs, surprisingly litigious",
    "Amusement park ride operators who've heard every pitch",
    "Competitive chess hustlers three moves ahead of your roadmap",
    "A retired astronauts' book club, mid-argument",
    "Night-shift bus drivers, your most loyal power users",
    "Escape room designers who built in an exit for this",
    "Search-and-rescue dog handlers, easily distracted",
    "Wedding DJs who only take requests via Slack",
    "Interstate rest-stop managers, chronically understaffed",
    "Middle management at a paperclip factory, mid-reorg",
    "Series A investors who just discovered TikTok",
    "Amish elders evaluating a Wi-Fi router",
    "Gate agents mid storm-delay, fresh out of patience",
    "Mall Santa contractors, seasonal but skeptical",
    "Timeshare sales trainers, impressed against their will",
    "IT admins who still run everything through a fax machine",
    "HR at a company with no HR",
  ];

  const TWISTS = [
    "7 days to get customers, starting yesterday",
    "Your only marketing channel is fax machines",
    "Banned from saying \"innovative\"",
    "Your team can only communicate in emojis",
    "No screens allowed during the pitch",
    "Product ships exclusively door-to-door",
    "Regulators just banned all online advertising",
    "Your entire budget is $27, non-negotiable",
    "Your CEO insists the pitch include a jingle",
    "Customer acquisition is limited to carrier pigeon",
    "Your target market actively distrusts technology",
    "You must pivot the idea halfway through the pitch",
    "A competitor just went viral for the opposite idea",
    "You are not allowed to mention the price, ever",
    "Your investor demands profitability by Friday",
    "Slides deleted five minutes ago, no backup",
    "The pitch must be delivered entirely in rhyme",
    "Analog channels only: print and radio",
    "Your target customer already filed a restraining order against your industry",
    "You must whisper the entire pitch",
    "Only your quietest teammate is allowed to speak",
    "The product must be pitched as a children's toy",
    "Deals can only close via handwritten letter",
    "Your team must pitch standing on one leg",
    "The pitch must end with a call-to-action to a landline",
    "The product must be positioned as $10,000 luxury, no exceptions",
    "You must convince investors this is actually a nonprofit",
    "The entire GTM plan must fit on one sticky note",
    "Your launch event is a gas station at 3am",
    "You can only advertise via newspaper classifieds",
    "Your board just replaced \"growth\" with \"vibes\" as the north star",
    "A competitor is giving your exact product away for free",
    "Your only case study is your own mother",
    "You must say \"blockchain\" at least three times",
    "Your app store rating is one star, from your cofounder",
    "The pitch must double as a wedding toast",
    "Legal just froze the word \"AI\" in all your marketing",
    "You must close the deal before the elevator hits the lobby",
    "Your only proof of demand is a group chat poll",
  ];

  // ---------- State ----------

  const STORAGE_KEYS = {
    team: "gtmRoulette_teamName",
    result: "gtmRoulette_result",
    locked: "gtmRoulette_locked",
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
  };

  const wheelCards = {
    product: document.querySelector('.wheel-card[data-cat="product"]'),
    buyer: document.querySelector('.wheel-card[data-cat="buyer"]'),
    twist: document.querySelector('.wheel-card[data-cat="twist"]'),
  };

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function getTeamName() {
    return localStorage.getItem(STORAGE_KEYS.team) || "";
  }

  function isLocked() {
    return localStorage.getItem(STORAGE_KEYS.locked) === "1";
  }

  function getSavedResult() {
    const raw = localStorage.getItem(STORAGE_KEYS.result);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // ---------- UI rendering ----------

  function renderTeamUI() {
    const name = getTeamName();
    if (name) {
      els.teamSection.classList.add("hidden");
      els.teamBanner.classList.remove("hidden");
      els.teamBannerName.textContent = name;
      els.spinBtn.disabled = isLocked();
    } else {
      els.teamSection.classList.remove("hidden");
      els.teamBanner.classList.add("hidden");
      els.spinBtn.disabled = true;
    }
  }

  function renderLockedResult() {
    const result = getSavedResult();
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
    if (spinning || isLocked() || !getTeamName()) return;
    spinning = true;
    els.spinBtn.disabled = true;
    els.spinBtnLabel.textContent = "🎰 SPINNING...";

    Object.values(wheelCards).forEach((c) => c.classList.remove("settled"));

    const finalProduct = pickRandom(PRODUCTS);
    const finalBuyer = pickRandom(BUYERS);
    const finalTwist = pickRandom(TWISTS);

    await Promise.all([
      spinReel(els.productValue, wheelCards.product, PRODUCTS, 1400, finalProduct),
      spinReel(els.buyerValue, wheelCards.buyer, BUYERS, 1900, finalBuyer),
      spinReel(els.twistValue, wheelCards.twist, TWISTS, 2400, finalTwist),
    ]);

    const result = { product: finalProduct, buyer: finalBuyer, twist: finalTwist };
    localStorage.setItem(STORAGE_KEYS.result, JSON.stringify(result));
    localStorage.setItem(STORAGE_KEYS.locked, "1");

    spinning = false;
    els.spinBtnLabel.textContent = "🔒 ALREADY SPUN";
    els.lockedNote.classList.remove("hidden");
    els.nextSteps.classList.remove("hidden");
    launchConfetti();
    els.nextSteps.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Event wiring ----------

  els.saveTeamBtn.addEventListener("click", () => {
    const name = els.teamNameInput.value.trim();
    if (!name) {
      els.teamNameInput.focus();
      els.teamNameInput.classList.add("shake");
      setTimeout(() => els.teamNameInput.classList.remove("shake"), 500);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.team, name);
    renderTeamUI();
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
    const ok = confirm("Reset this device for a new team? This clears the current team's name and spin result on THIS phone only.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEYS.team);
    localStorage.removeItem(STORAGE_KEYS.result);
    localStorage.removeItem(STORAGE_KEYS.locked);
    els.teamNameInput.value = "";
    els.productValue.textContent = "???";
    els.buyerValue.textContent = "???";
    els.twistValue.textContent = "???";
    Object.values(wheelCards).forEach((c) => c.classList.remove("settled", "spinning"));
    els.spinBtnLabel.textContent = "🎲 SPIN THE ROULETTE";
    els.lockedNote.classList.add("hidden");
    els.nextSteps.classList.add("hidden");
    renderTeamUI();
  });

  // ---------- Init ----------

  renderTeamUI();
  if (isLocked()) {
    renderLockedResult();
  }
})();
