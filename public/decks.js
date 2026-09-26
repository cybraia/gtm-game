/*
 * GTM Roulette content decks + matching logic.
 *
 * Categories are INTERNAL metadata and are never rendered in the UI. Used by
 * the API (lib/game.js) and, when the game server isn't reachable, by the page
 * itself so spinning still works (saved on that device only).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GTM_DECKS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PRODUCTS = [
    { text: "AI that predicts employee resignations from Slack emojis", cats: ["HR"] },
    { text: "Smart pillow that reports employee dreams to HR", cats: ["HR"] },
    { text: "AI that detects fake enthusiasm during company all-hands", cats: ["HR"] },
    { text: "Employee engagement software that rewards people for attending unnecessary meetings", cats: ["HR"] },
    { text: "AI agent that negotiates your home rent in HSR Layout", cats: ["Operations"] },
    { text: "AI agent that finds parking in Bengaluru and reserves your space", cats: ["Operations"] },
    { text: "Smart umbrella that predicts all four daily Bengaluru weather changes", cats: ["Operations"] },
    { text: "AI power-cut predictor that's accurate only after the power goes out", cats: ["Operations"] },
    { text: "Office parking marketplace where nobody actually owns the parking spots", cats: ["Operations"] },
    { text: "AI that predicts when ORR traffic will finally clear", cats: ["Operations"] },
    { text: "CRM that automatically follows up with people who ghost you", cats: ["Sales"] },
    { text: "AI agents that attend sales demos and negotiate with other AI agents", cats: ["Sales"] },
    { text: "Software that converts every LinkedIn connection into a sales forecast", cats: ["Sales"] },
    { text: "AI cold-email writer that apologizes before pitching", cats: ["Sales"] },
    { text: "CRM that tracks how many times a prospect says \"circle back\"", cats: ["Sales"] },
    { text: "Blockchain-verified handshakes for enterprise contracts", cats: ["Finance"] },
    { text: "AI CFO that approves every expense except the CEO's", cats: ["Finance"] },
    { text: "Subscription management software for subscriptions nobody remembers buying", cats: ["Finance"] },
    { text: "AI that predicts your next funding round based on founder LinkedIn activity", cats: ["Finance"] },
    { text: "Expense management software that automatically rejects team outings", cats: ["Finance"] },
    { text: "AI-powered meeting scheduler that schedules meetings to discuss other meetings", cats: ["Productivity"] },
    { text: "AI agents that convert every meeting into 47 Jira tickets", cats: ["Productivity"] },
    { text: "Smart calendar that blocks every Friday for \"strategic thinking\"", cats: ["Productivity"] },
    { text: "AI assistant that rewrites every Slack message in corporate jargon", cats: ["Productivity"] },
    { text: "AI that automatically declines meetings with more than eight participants", cats: ["Productivity"] },
    { text: "AI that generates LinkedIn thought leadership from office chat conversations", cats: ["Marketing"] },
    { text: "AI-powered billboard that changes its message based on Bengaluru traffic", cats: ["Marketing"] },
    { text: "AI that turns every customer complaint into a five-star testimonial", cats: ["Marketing"] },
    { text: "AI software that guarantees your brand appears in every AI answer, including irrelevant ones", cats: ["Marketing"] },
    { text: "AI that predicts which LinkedIn posts will get exactly three likes", cats: ["Marketing"] },
    { text: "AI code reviewer that approves every pull request but breaks production on Fridays", cats: ["Productivity"] },
    { text: "AI that translates every production incident into a reassuring message for the CEO", cats: ["Productivity"] },
  ];

  const BUYERS = [
    { text: "HR leaders at Bengaluru startups with 200+ employees", cats: ["HR"] },
    { text: "Chief People Officers managing return-to-office mandates", cats: ["HR", "Operations"] },
    { text: "Recruitment heads hiring 100 engineers in six months", cats: ["HR"] },
    { text: "Founders whose employees keep resigning after appraisal season", cats: ["HR", "Finance"] },
    { text: "HR directors at US SaaS companies with distributed teams", cats: ["HR", "Productivity"] },
    { text: "Office administrators managing three Bengaluru locations", cats: ["Operations"] },
    { text: "Facilities heads at tech parks in Whitefield", cats: ["Operations"] },
    { text: "Founders negotiating their third office lease in HSR Layout", cats: ["Operations", "Finance"] },
    { text: "Operations managers running employee transportation across ORR", cats: ["Operations"] },
    { text: "Procurement heads at enterprises with 18-month approval cycles", cats: ["Operations", "Finance"] },
    { text: "VPs of Sales at Indian SaaS companies expanding into the US", cats: ["Sales"] },
    { text: "Founders trying to acquire their first ten US enterprise customers", cats: ["Sales", "Marketing"] },
    { text: "SDR managers whose teams are tired of writing cold emails", cats: ["Sales", "Productivity"] },
    { text: "Revenue leaders at Series B startups missing quarterly targets", cats: ["Sales", "Finance"] },
    { text: "Enterprise account executives chasing deals stuck in legal", cats: ["Sales", "Finance"] },
    { text: "CFOs at Series A startups with six months of runway", cats: ["Finance"] },
    { text: "Finance heads managing 40 forgotten SaaS subscriptions", cats: ["Finance", "Operations"] },
    { text: "VC partners reviewing their 300th AI pitch this month", cats: ["Finance", "Marketing"] },
    { text: "Founders preparing their next board meeting", cats: ["Finance", "Productivity"] },
    { text: "Controllers at US companies managing offshore Indian teams", cats: ["Finance", "Productivity"] },
    { text: "Engineering managers whose calendars are 90% meetings", cats: ["Productivity"] },
    { text: "Chiefs of Staff at Bengaluru startups managing five founders' priorities", cats: ["Productivity"] },
    { text: "Product managers who spend more time updating Jira than shipping", cats: ["Productivity"] },
    { text: "Remote team leaders coordinating India-US time zones", cats: ["Productivity", "HR"] },
    { text: "IT administrators managing 200 employees and 400 AI tools", cats: ["Productivity", "Operations"] },
    { text: "CMOs at Indian SaaS companies entering the US market", cats: ["Marketing"] },
    { text: "Demand generation heads struggling to attribute pipeline", cats: ["Marketing", "Sales"] },
    { text: "Product marketers launching their fifth AI feature this quarter", cats: ["Marketing", "Productivity"] },
    { text: "Agency founders managing 20 demanding B2B clients", cats: ["Marketing", "Productivity"] },
    { text: "Marketing heads whose CEO wants every LinkedIn post to go viral", cats: ["Marketing"] },
  ];

  const TWISTS = [
    "Your only distribution channel is a residential WhatsApp group with three uncles in it.",
    "Your biggest competitor just made the exact same product free.",
    "You have ₹500 and seven days to acquire your first customer.",
    "Your entire pitch must sound like an auto driver negotiating a fare during Bengaluru peak-hour traffic.",
    "You must pitch standing on one leg.",
    "Legal has banned you from using the words AI, innovative and revolutionary.",
    "Your only customer testimonial is from your mother.",
    "Your product must be positioned as a ₹10 lakh luxury purchase.",
    "You can only close deals over filter coffee. No espresso allowed.",
    "Your entire GTM strategy must fit on one sticky note.",
    "Your investor wants profitability by Friday.",
    "You can only acquire customers through newspaper classifieds.",
    "Your pitch must end with a call to action to a landline number.",
    "Your only marketing channel is LinkedIn comments.",
    "You must convince the buyer that your product is actually a nonprofit.",
    "Your only sales rep is an AI agent that keeps hallucinating prices.",
    "You have to explain your business entirely through Bengaluru traffic metaphors.",
    "Your launch event is scheduled during a Bengaluru monsoon power cut.",
    "Your product demo must finish before the last Namma Metro train.",
    "Your competitor has 100 times your marketing budget.",
    "Your buyer has banned PowerPoint presentations.",
    "Your first customer wants a 90% discount and lifetime support.",
    "Your entire team can communicate only using emojis.",
    "Your app has a one-star rating from your own co-founder.",
    "You have to acquire your first 100 customers without using the internet.",
    "Your only distribution partner is an auto driver who keeps cancelling rides.",
    "Your pitch must double as a wedding toast.",
    "Your product has to be sold exclusively to companies with no budget.",
    "Your board has replaced revenue with vibes as its north-star metric.",
    "You must close the deal before the elevator reaches the ground floor.",
  ];

  function pickRandom(list, rand) {
    return list[Math.floor((rand || Math.random)() * list.length)];
  }

  function compatibleBuyers(product) {
    return BUYERS.filter((b) => b.cats.some((c) => product.cats.includes(c)));
  }

  // One spin: random product -> random buyer sharing >= 1 category -> random twist from the whole deck.
  function spin(rand) {
    const product = pickRandom(PRODUCTS, rand);
    const buyer = pickRandom(compatibleBuyers(product), rand);
    const twist = pickRandom(TWISTS, rand);
    return { product: product.text, buyer: buyer.text, twist: twist };
  }

  // Text-only lists for the reel animation (no categories).
  function publicDecks() {
    return {
      products: PRODUCTS.map((p) => p.text),
      buyers: BUYERS.map((b) => b.text),
      twists: TWISTS.slice(),
    };
  }

  return { PRODUCTS, BUYERS, TWISTS, compatibleBuyers, spin, publicDecks };
});
