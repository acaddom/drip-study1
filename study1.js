/* =============================================================================
 * Study 1 - Delayed disclosure of surcharges and predecisional distortion
 * jsPsych 8.3 implementation (plugins: survey 4.0, call-function 2.1, pipe 0.6)
 *
 * Protocol: ../studio1_protocollo.md (simplified design: section 15)
 * Questionnaire text: ../survey/study1_survey_en.md (same wording)
 * Output: a long CSV with row_type = "attr" (one row per attribute) and one
 * row_type = "post" row, identical in format to the PsychoJS version, so it is
 * read by read_psychojs() + compute_id() in ../studio1_analisi.R. A full jsPsych
 * JSON file with every trial is saved as well.
 *
 * URL parameters:
 *   PROLIFIC_PID, STUDY_ID, SESSION_ID   filled in by Prolific
 *   cond=drip|partitioned|baseline       force a condition (testing / one Prolific study per cell)
 *   design=simplified|full               override CONFIG.design (testing)
 *   debug=1                              download the data files at the end, no redirect
 * ========================================================================== */

/* ------------------------------------------------------------------------- */
/* 1. CONFIGURATION - edit before going live                                 */
/* ------------------------------------------------------------------------- */
const CONFIG = {
  // "simplified": 6 attributes in a fixed order (protocol, section 15)
  // "full":       10 attributes, base fare first and the other nine in random order
  design: "simplified",
  conditionWeights: { drip: 275, partitioned: 275, baseline: 165 },

  // Data saving through DataPipe -> OSF (https://pipe.jspsych.org); "" = disabled
  dataPipeExperimentId: "",

  completionUrl: "https://app.prolific.com/submissions/complete?cc=XXXXXXX",
  noConsentUrl: "https://app.prolific.com/submissions/complete?cc=NOCONSENT",
  minOverviewSeconds: 10,
  currency: "€"
};

/* Levels of the informational attributes are provisional (Pretest A). */
const ATTRIBUTES = [
  { id: "base", type: "base", name: "Base fare", price: 259, short: "€ 259.00",
    text: "Round-trip economy fare. Includes one small personal item that fits under the seat (40 × 30 × 20 cm)." },
  { id: "carry", type: "addon", name: "Carry-on bag", price: 19, short: "+ € 19.00",
    text: "One cabin bag up to 10 kg (55 × 40 × 20 cm) in the overhead bin, on both flights." },
  { id: "checked", type: "addon", name: "Checked bag", price: 51, short: "+ € 51.00",
    text: "One checked bag up to 23 kg, on both flights." },
  { id: "seat", type: "addon", name: "Seat selection", price: 21, short: "+ € 21.00",
    text: "Choose your seat on both flights. Without it, a seat is assigned at check-in." },
  { id: "priority", type: "addon", name: "Priority boarding", price: 15, short: "+ € 15.00",
    text: "Board the aircraft before other passengers, on both flights." },
  { id: "insurance", type: "addon", name: "Travel insurance", price: 74, short: "+ € 74.00",
    text: "Covers trip cancellation, medical expenses abroad and lost luggage." },
  { id: "punct", type: "info", name: "On-time performance", price: 0, short: "78% on time",
    text: "78% of flights on this route arrived on time over the last 12 months." },
  { id: "legroom", type: "info", name: "Legroom", price: 0, short: "76 cm",
    text: "76 cm (30 in) of space between seat rows." },
  { id: "rating", type: "info", name: "Customer rating", price: 0, short: "3.8 / 5",
    text: "3.8 out of 5, based on 2,140 passenger reviews." },
  { id: "times", type: "info", name: "Flight times", price: 0, short: "06:50 / 22:15",
    text: "Outbound flight departs at 06:50; return flight departs at 22:15." }
];
/* Fixed order of the simplified design (airline booking funnel) */
const SIMPLIFIED_ORDER = ["base", "punct", "checked", "rating", "seat", "insurance"];

const AIRLINES = ["Avenor Air", "Brisvale", "Corvano Airways", "Delvia", "Estrelo Air",
                  "Falcora", "Galenta Airways", "Halvane", "Iridia Air", "Torvenna"];

/* ------------------------------------------------------------------------- */
/* 2. SESSION SET-UP                                                          */
/* ------------------------------------------------------------------------- */
const params = new URLSearchParams(window.location.search);
const DEBUG = params.get("debug") === "1";
if (["simplified", "full"].includes(params.get("design"))) CONFIG.design = params.get("design");
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function drawCondition() {
  const forced = params.get("cond");
  if (forced && CONFIG.conditionWeights[forced] !== undefined) return forced;
  const w = CONFIG.conditionWeights;
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const [c, v] of Object.entries(w)) { if ((r -= v) < 0) return c; }
  return "drip";
}

const COND = drawCondition();
const EXP = COND !== "baseline";
const byId = id => ATTRIBUTES.find(a => a.id === id);
const ORDER = CONFIG.design === "simplified" ? SIMPLIFIED_ORDER.map(byId)
                                             : [ATTRIBUTES[0]].concat(shuffle(ATTRIBUTES.slice(1)));
const ADDONS = ATTRIBUTES.filter(a => a.type === "addon" && ORDER.includes(a));
const AIRLINE_ORDER = shuffle(AIRLINES);

const META = {
  participant: params.get("PROLIFIC_PID") || "anon_" + Math.random().toString(36).slice(2, 10),
  study_id: params.get("STUDY_ID") || "",
  session_id: params.get("SESSION_ID") || "",
  condition: COND,
  design: CONFIG.design,
  attr_order: ORDER.map(a => a.id).join(";"),
  version: "study1-jspsych-v1.0"
};

const R = {};          // all responses, keyed by question name
const PAGE_MS = {};    // time spent on each screen (ms)
const fmt = v => CONFIG.currency + " " + v.toFixed(2);

const jsPsych = initJsPsych({
  show_progress_bar: true,
  auto_update_progress_bar: true,
  message_progress_bar: ""
});
jsPsych.data.addProperties(META);

/* ------------------------------------------------------------------------- */
/* 3. HTML HELPERS                                                            */
/* ------------------------------------------------------------------------- */
const priceLabel = a => a.short;

function attributeCard(a, airline) {
  const head = airline ? `<div class="airline">Flight offered by <b>${airline}</b></div>` : "";
  const kind = a.type === "addon" ? "Optional service" : a.type === "base" ? "Mandatory" : "Flight information";
  return `${head}<div class="card"><div class="kind">${kind}</div>
    <div class="attr-row"><span class="attr-name">${a.name}</span>
    <span class="attr-price">${a.type === "info" ? "" : a.short}</span></div>
    <div class="attr-text">${a.text}</div></div>`;
}

function priceTable(items, currentId, title) {
  const rows = items.map(a => `<tr class="${a.id === currentId ? "current" : ""}">
    <td>${a.name}${a.type === "addon" ? ' <span class="opt">(optional)</span>' : ""}</td>
    <td>${priceLabel(a)}</td></tr>`).join("");
  return `<div class="summary"><div class="summary-title">${title}</div><table class="ptable">${rows}</table></div>`;
}

const currentTotal = () => ORDER.reduce((s, a) => s + (a.type === "base" ? a.price :
  (a.type === "addon" && R["add_" + a.id] === "yes" ? a.price : 0)), 0);

/* ------------------------------------------------------------------------- */
/* 4. QUESTION BUILDING BLOCKS (SurveyJS JSON, rendered by jsPsych survey)    */
/* ------------------------------------------------------------------------- */
const AGREE7 = [
  { value: 1, text: "Strongly disagree" }, { value: 2, text: "Disagree" }, { value: 3, text: "Somewhat disagree" },
  { value: 4, text: "Neither agree nor disagree" }, { value: 5, text: "Somewhat agree" },
  { value: 6, text: "Agree" }, { value: 7, text: "Strongly agree" }];
const ATTRACT = [
  { value: -3, text: "Much less attractive" }, { value: -2, text: "Less attractive" },
  { value: -1, text: "Slightly less attractive" }, { value: 0, text: "Neither more nor less attractive" },
  { value: 1, text: "Slightly more attractive" }, { value: 2, text: "More attractive" },
  { value: 3, text: "Much more attractive" }];

const radio = (name, title, choices, extra = {}) => ({ type: "radiogroup", name, title, choices, isRequired: true, ...extra });
const HTML_NAMES = new Set();   // display-only elements, left out of the data
const html = (name, content) => (HTML_NAMES.add(name), { type: "html", name, html: content });
const confidence = (name, title) => ({
  type: "slider", name, title, isRequired: true, min: 50, max: 100, step: 1,
  description: "Drag the slider: 50 = completely unsure (50-50), 100 = completely sure.",
  customLabels: [{ value: 50, text: "50" }, { value: 75, text: "75" }, { value: 100, text: "100" }]
});
const number = (name, title, min, max) => ({ type: "text", inputType: "number", name, title, isRequired: true, min, max });

/* One screen = one jsPsych trial. `elements` may be a function (evaluated when
 * the screen starts, so it can use earlier answers). */
function screen(name, elements, { fn, completeText = "Next" } = {}) {
  return {
    type: jsPsychSurvey,
    survey_json: () => ({
      showQuestionNumbers: "off", completeText, questionErrorLocation: "bottom",
      widthMode: "static", width: "860px",
      elements: typeof elements === "function" ? elements() : elements
    }),
    survey_function: survey => { window.STUDY1_SURVEY = survey; if (fn) fn(survey); },   // hook used by automated tests
    data: { screen: name },
    on_finish: d => { Object.assign(R, d.response); PAGE_MS[name] = d.rt; }
  };
}

/* ------------------------------------------------------------------------- */
/* 5. SCREENS                                                                 */
/* ------------------------------------------------------------------------- */
const SCENARIO = {
  drip: "On the following screens you will see the information about this flight <b>one piece at a time</b>, " +
        "in the order in which the airline's website presents it. Some screens describe optional services that " +
        "you can add to your booking.",
  partitioned: "First you will see an <b>overview of all the information and prices</b> for this flight, " +
        "including the optional services. Then you will go through each piece of information one at a time. " +
        "The full overview stays visible on every screen.",
  baseline: `On the following screens you will see information about <b>${ORDER.length === 6 ? "six" : "ten"} ` +
        "different flights</b> to the same destination, each offered by a <b>different airline</b>. " +
        "Every screen refers to a different flight."
};
const SCENARIO_HTML = `<div class="scenario"><p>Imagine that you are planning a <b>round-trip flight</b>.
  The destination is about <b>5,000 km</b> away and each flight lasts about <b>6 hours</b>.
  You are booking on an airline's website.</p><p>${SCENARIO[COND]}</p>
  <p>There are no right or wrong answers. Please answer as you would if you were really booking.</p></div>`;
const COMP = [{ value: "oneway", text: "One-way" }, { value: "roundtrip", text: "Round-trip" },
              { value: "unsure", text: "I am not sure" }];

const timeline = [];

/* Consent */
timeline.push({
  ...screen("consent", [
    html("consent_text", `<h3>Information and consent</h3><p>[Insert the participant information sheet approved
      by the ethics committee: purpose, duration (about 8-15 minutes), compensation, anonymity, voluntary
      participation and right to withdraw, data storage, contact details.]</p>`),
    radio("consent", "Do you agree to take part in this study?",
      [{ value: "yes", text: "Yes, I agree to take part" }, { value: "no", text: "No, I do not agree" }])
  ]),
  on_finish: d => {
    Object.assign(R, d.response); PAGE_MS.consent = d.rt;
    if (R.consent === "no") {
      jsPsych.abortExperiment("<p>You did not consent to take part. Thank you for your time.</p>");
      if (!DEBUG) setTimeout(() => { window.location.href = CONFIG.noConsentUrl; }, 2000);
    }
  }
});

timeline.push(screen("attention", [
  radio("attn1", "People differ in how they like to travel. To show that you are reading the questions carefully, " +
    "please select \"Somewhat disagree\" for this statement: \"I enjoy planning trips.\"", AGREE7)
]));

timeline.push(screen("scenario", [html("scenario_text", SCENARIO_HTML)]));
timeline.push(screen("comprehension", [radio("comp1", "Is the flight described in the scenario one-way or round-trip?", COMP)]));
timeline.push({
  timeline: [screen("comprehension_retry", [
    html("again", "<p class='note'>Please read the scenario again.</p>" + SCENARIO_HTML),
    radio("comp2", "Is the flight described in the scenario one-way or round-trip?", COMP)
  ])],
  conditional_function: () => R.comp1 !== "roundtrip"
});

/* Partitioned: overview of all prices, minimum viewing time */
if (COND === "partitioned") {
  timeline.push(screen("overview", [
    html("overview_table", `<p>Here is an overview of all the information about the flight and the price of each
      optional service. The base fare is mandatory; all services are optional.</p>` +
      priceTable(ORDER, null, "All flight information and prices") + `<p class="note" id="overview-wait"></p>`)
  ], { fn: survey => {
    const t0 = performance.now();
    survey.onCompleting.add((s, o) => {
      const left = CONFIG.minOverviewSeconds - (performance.now() - t0) / 1000;
      if (left > 0) {
        o.allow = false;
        const el = document.getElementById("overview-wait");
        if (el) el.textContent = `Please take a moment to look at the table. You can continue in ${Math.ceil(left)} seconds.`;
      }
    });
  } }));
}

/* Attribute screens */
ORDER.forEach((a, k) => {
  timeline.push(screen("attr_" + (k + 1), () => {
    if (!EXP) {
      const airline = AIRLINE_ORDER[k];
      return [html("ctx_" + a.id, attributeCard(a, airline)),
              radio("eval_" + a.id, `This information makes ${airline}'s flight…`, ATTRACT)];
    }
    const items = COND === "drip" ? ORDER.slice(0, k + 1) : ORDER;
    const els = [
      html("ctx_" + a.id, priceTable(items, a.id, COND === "drip" ? "Information seen so far" : "All flight information and prices") +
        `<div class="total">Your package so far: <b>${fmt(currentTotal())}</b></div>` + attributeCard(a)),
      radio("eval_" + a.id, "This information makes the flight…", ATTRACT),
      radio("lead_" + a.id, "Right now, are you leaning towards buying or not buying this flight?",
        [{ value: 1, text: "Buying this flight" }, { value: 0, text: "Not buying this flight" }], { colCount: 2 }),
      confidence("conf_" + a.id, "How confident are you in this leaning?")
    ];
    if (a.type === "addon") {
      els.push(radio("add_" + a.id, "Do you want to add this service to your package?",
        [{ value: "yes", text: "Yes, add it" }, { value: "no", text: "No" }], { colCount: 2 }));
    }
    return els;
  }));
});

/* Package review and post-task measures (experimental conditions) */
if (EXP) {
  timeline.push(screen("review", () => [
    html("review_intro", "<h3>Your package</h3><p>Here is the package you have put together. You can add or remove " +
      "services before making your final decision.</p>"),
    { type: "checkbox", name: "final_addons", title: "Selected optional services",
      choices: ADDONS.map(a => ({ value: a.id, text: `${a.name} (+ ${fmt(a.price)})` })),
      defaultValue: ADDONS.filter(a => R["add_" + a.id] === "yes").map(a => a.id) },
    html("review_total", ""),
    radio("final_buy", "Would you book this flight with the package you have put together?",
      [{ value: 1, text: "Yes, I would book it" }, { value: 0, text: "No, I would not book it" }], { colCount: 2 }),
    confidence("final_conf", "How confident are you in this decision?")
  ], { fn: survey => {
    const refresh = () => {
      const sel = survey.getValue("final_addons") || [];
      survey.getQuestionByName("review_total").html =
        `<div class="total">Total price with base fare: <b>${fmt(259 + ADDONS.filter(a => sel.includes(a.id)).reduce((s, a) => s + a.price, 0))}</b></div>`;
    };
    refresh();
    survey.onValueChanged.add((s, o) => { if (o.name === "final_addons") refresh(); });
  } }));

  timeline.push(screen("estimate", [number("total_estimate",
    "Without going back, what was the total price of the package you chose (in €)?", 0, 5000)]));

  timeline.push(screen("evaluations", () => [{
    type: "matrix", name: "post", isAllRowRequired: true, alternateRows: true,
    title: "How much do you agree with the following statements?", columns: AGREE7,
    rows: shuffle([
      { value: "sat1", text: "I am satisfied with the package I put together." },
      { value: "sat2", text: "The choice I made is a good one." },
      { value: "sat3", text: "I am happy with the way I made my booking." },
      { value: "fair1", text: "The total price of the flight is fair." },
      { value: "fair2", text: "The way the prices were presented was fair." },
      { value: "fair3", text: "The airline's pricing is acceptable." },
      { value: "dec1", text: "I felt misled by the way the prices were presented." },
      { value: "dec2", text: "The airline tried to push me into spending more." },
      { value: "dec3", text: "Some costs were hidden from me at first." }])
  }]));

  timeline.push(screen("manipcheck", [radio("manip",
    "When you first saw the base fare, did you already know which optional services would be offered and what they would cost?",
    [{ value: "yes", text: "Yes" }, { value: "no", text: "No" }, { value: "dontknow", text: "I don't remember" }])]));
}

timeline.push(screen("habits", [
  { type: "dropdown", name: "flights12", isRequired: true,
    title: "How many flights (one-way trips) have you taken in the last 12 months?",
    choices: ["0", "1-2", "3-5", "6-10", "More than 10"] },
  { type: "matrix", name: "habit", isAllRowRequired: true,
    title: "When you fly, how often do you usually purchase each of these services?",
    columns: [{ value: 0, text: "Never" }, { value: 1, text: "Sometimes" }, { value: 2, text: "Almost always" }],
    rows: ADDONS.map(a => ({ value: a.id, text: a.name })) },
  { type: "matrix", name: "pc", isAllRowRequired: true, alternateRows: true,
    title: "How much do you agree with the following statements?",
    description: "[Price consciousness scale: verify wording against Lichtenstein, Ridgway & Netemeyer (1993) before use.]",
    columns: AGREE7, rows: [
      { value: "pc1", text: "I am not willing to go to extra effort to find lower prices." },
      { value: "pc2", text: "I will shop at more than one store to take advantage of low prices." },
      { value: "pc3", text: "The money saved by finding low prices is usually not worth the time and effort." },
      { value: "pc4", text: "I would never shop at more than one store to find low prices." },
      { value: "pc5", text: "The time it takes to find low prices is usually not worth the effort." }] }
]));

timeline.push(screen("recall", [
  html("recall_intro", "<p>Please answer from memory, without guessing if you can avoid it.</p>"),
  number("recall_checked", "What was the price of the checked bag (in €)?", 0, 1000),
  ...(ORDER.some(a => a.id === "priority")
    ? [number("recall_priority", "What was the price of priority boarding (in €)?", 0, 1000)]
    : [number("recall_seat", "What was the price of seat selection (in €)?", 0, 1000)])
]));

timeline.push(screen("demographics", [
  number("age", "How old are you?", 18, 99),
  radio("gender", "What is your gender?", ["Woman", "Man", "Non-binary / other", "Prefer not to say"]),
  { type: "dropdown", name: "education", isRequired: true, title: "What is your highest level of education?",
    choices: ["Lower secondary or less", "Upper secondary (high school)", "Bachelor's degree",
              "Master's degree or equivalent", "Doctorate"] },
  radio("income", "How would you describe your household's financial situation?",
    ["We find it very difficult to get by", "We find it difficult to get by", "We get by",
     "We live comfortably", "We live very comfortably"]),
  { type: "comment", name: "comments", title: "Any comments about this study? (optional)" }
], { completeText: "Submit" }));

/* ------------------------------------------------------------------------- */
/* 6. DATA: long CSV for R (same format as the PsychoJS version) + full JSON   */
/* ------------------------------------------------------------------------- */
function buildRows() {
  const finalSel = R.final_addons || [];
  const habit = R.habit || {};
  const rows = ORDER.map((a, k) => ({
    row_type: "attr", id: META.participant, cond: COND, attr: a.id, type: a.type, pos: k + 1,
    rating: R["eval_" + a.id] ?? "",
    leader: EXP ? (R["lead_" + a.id] ?? "") : "",
    conf: EXP ? (R["conf_" + a.id] ?? "") : "",
    add_initial: EXP && a.type === "addon" ? (R["add_" + a.id] === "yes" ? 1 : 0) : "",
    final_add: EXP && a.type === "addon" ? (finalSel.includes(a.id) ? 1 : 0) : "",
    habit: a.type === "addon" ? (habit[a.id] ?? "") : "",
    price: a.price, airline: EXP ? "" : AIRLINE_ORDER[k], page_ms: PAGE_MS["attr_" + (k + 1)] ?? ""
  }));
  const post = { row_type: "post", id: META.participant, cond: COND };
  for (const [key, v] of Object.entries(R)) {
    if (/^(eval|lead|conf|add)_/.test(key) || key === "habit" || HTML_NAMES.has(key)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(post, v);       // matrices: sat1, pc1, ...
    else post[key] = Array.isArray(v) ? v.join(";") : v;
  }
  post.page_ms_json = JSON.stringify(PAGE_MS);
  post.user_agent = navigator.userAgent;
  rows.push(post);
  return rows.map(r => ({ ...r, ...META, participant: META.participant }));
}

function toCsv(rows) {
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(",")].concat(rows.map(r => cols.map(c => esc(r[c])).join(","))).join("\n") + "\n";
}

let SAVE_FAILED = false;

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

timeline.push({
  type: jsPsychCallFunction,
  async: true,
  func: async done => {
    jsPsych.getDisplayElement().innerHTML = "<p>Saving your responses, please wait…</p>";
    const csv = toCsv(buildRows());
    const json = jsPsych.data.get().json();
    const base = `study1_${CONFIG.design}_${COND}_${META.participant}_${Date.now()}`;
    window.STUDY1_RESULT = { R, PAGE_MS, META, csv };          // used by automated tests
    let ok = true;
    if (CONFIG.dataPipeExperimentId) {
      // saveData returns the server reply ({error: ...} on failure) or the network Error; it does not throw
      const failed = r => !r || r instanceof Error || !!r.error;
      for (const [file, text] of [[base + "_long.csv", csv], [base + "_raw.json", json]]) {
        let r = await jsPsychPipe.saveData(CONFIG.dataPipeExperimentId, file, text);
        if (failed(r)) r = await jsPsychPipe.saveData(CONFIG.dataPipeExperimentId, file, text);   // one retry
        if (failed(r)) { ok = false; console.error("DataPipe:", r); }
      }
    }
    if (DEBUG || !ok || !CONFIG.dataPipeExperimentId) {
      download(base + "_long.csv", csv, "text/csv");
      download(base + "_raw.json", json, "application/json");
    }
    SAVE_FAILED = !!CONFIG.dataPipeExperimentId && !ok;
    done({ saved_to_datapipe: !!CONFIG.dataPipeExperimentId && ok });
  }
});

timeline.push({
  type: jsPsychSurvey,
  survey_json: () => ({
    showQuestionNumbers: "off", completeText: "Return to Prolific", widthMode: "static", width: "860px",
    elements: [html("debrief", "<h3>Thank you!</h3>" + (SAVE_FAILED
      ? "<p class='note'>Your responses could not be sent to our server. Two data files have been downloaded to your " +
        "computer: please send them to the researcher through Prolific's messaging system. You will still be paid.</p>"
      : "<p>Your responses have been saved.</p>") +
      "<p><b>Debriefing.</b> [Insert debriefing approved by the ethics committee: the prices and services were " +
      "fictitious; the study examines how the way prices are presented affects evaluations and choices.]</p>")]
  }),
  data: { screen: "debrief" },
  on_finish: () => { if (!DEBUG) window.location.href = CONFIG.completionUrl; }
});

jsPsych.run(timeline);
