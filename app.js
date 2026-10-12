// Default expenses carry a key so their names follow the chosen language
const DEFAULTS = [
  { key: "rent", amount: 3500 },
  { key: "groceries", amount: 1800 },
  { key: "transport", amount: 20, daily: true },
  { key: "coffee", amount: 15, daily: true },
  { key: "utilities", amount: 350 },
  { key: "internet", amount: 250 },
];
const DEFAULT_CURRENCY = "DH";
// Symbols written before the number ($120); everything else goes after (120 DH)
const PREFIX = new Set(["$", "€", "£", "¥", "₹", "CA$"]);
const DAYS = [28, 29, 30, 31];
const KEY = "monthly-spend-v1";
const THEME_KEY = "monthly-spend-theme";
const LANG_KEY = "monthly-spend-lang";

/* ---------- Language ---------- */

let lang = "en";
try { const l = localStorage.getItem(LANG_KEY); if (I18N[l]) lang = l; } catch (e) {}
// Look up a UI string, calling it with args when it is a function
const t = (k, ...a) => { const v = I18N[lang][k] ?? I18N.en[k]; return typeof v === "function" ? v(...a) : v; };
const label = it => (it.key && I18N[lang].items[it.key]) || it.title;
const DRAFT = "monthly-spend-draft";

const $ = id => document.getElementById(id);
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const defaultItems = () => DEFAULTS.map(d => ({ key: d.key, title: I18N.en.items[d.key], amount: d.amount, daily: !!d.daily, custom: false, done: false }));
// Data saved before translations existed: recognise default expenses by their English name
const keyFor = it => (it.key && I18N.en.items[it.key] ? it.key : !it.custom ? Object.keys(I18N.en.items).find(k => I18N.en.items[k] === it.title) : undefined);
const fresh = () => ({ salary: 0, days: 30, currency: DEFAULT_CURRENCY, month: monthKey(), items: defaultItems() });

// Load saved data, repairing anything missing or malformed
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!s || !Array.isArray(s.items)) return fresh();
  return {
    salary: num(s.salary),
    days: DAYS.includes(s.days) ? s.days : 30,
    currency: (typeof s.currency === "string" && s.currency.trim()) || DEFAULT_CURRENCY,
    month: typeof s.month === "string" ? s.month : monthKey(),
    items: s.items
      .filter(it => it && typeof it.title === "string" && it.title.trim())
      .map(it => {
        const item = { title: it.title.trim().slice(0, 40), amount: num(it.amount), daily: !!it.daily, custom: !!it.custom, done: !!it.done };
        const key = keyFor(it);
        if (key) item.key = key;
        return item;
      }),
  };
}

let state = load();

// A new month started: every expense is unpaid again
function rollMonth() {
  const now = monthKey();
  if (state.month === now) return false;
  state.month = now;
  state.items.forEach(it => { it.done = false; });
  return true;
}
rollMonth();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
const monthly = it => it.amount * (it.daily ? state.days : 1);

function fmt(n) {
  const cur = state.currency || DEFAULT_CURRENCY;
  const s = Math.abs(n).toLocaleString(I18N[lang].locale, { maximumFractionDigits: 2 });
  const sign = n < 0 ? "−" : "";
  return PREFIX.has(cur) ? `${sign}${cur}${s}` : `${sign}${s} ${cur}`;
}

/* ---------- Rendering ---------- */

function render() {
  $("salary").value = state.salary || "";
  const list = $("list");
  list.replaceChildren();
  state.items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "row" + (it.done ? " done" : "");

    const check = document.createElement("label");
    check.className = "check";
    const box = document.createElement("input");
    box.type = "checkbox"; box.checked = it.done;
    box.setAttribute("aria-label", t("paidAria", label(it)));
    box.addEventListener("change", () => { it.done = box.checked; row.classList.toggle("done", it.done); update(); });
    check.append(box);

    const name = document.createElement("span");
    name.className = "name";
    const title = document.createElement("span");
    title.className = "title"; title.textContent = label(it);
    name.append(title);
    if (it.custom) { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = t("custom"); name.append(tag); }
    const hint = document.createElement("span");
    hint.className = "hint"; hint.dataset.i = i;
    name.append(hint);

    const amt = document.createElement("input");
    amt.type = "number"; amt.min = "0"; amt.step = "any"; amt.className = "amt";
    amt.inputMode = "decimal"; amt.enterKeyHint = "done";
    amt.id = "amt-" + i; amt.value = it.amount || ""; amt.placeholder = "0";
    amt.setAttribute("aria-label", t("amountAria", label(it)));
    amt.addEventListener("input", () => { it.amount = num(amt.value); update(); });

    const fq = document.createElement("button");
    fq.type = "button"; fq.className = "freq" + (it.daily ? " on" : "");
    fq.textContent = t(it.daily ? "day" : "mo");
    fq.setAttribute("aria-label", t("freqAria", label(it), t(it.daily ? "perDay" : "perMonth")));
    fq.addEventListener("click", () => { it.daily = !it.daily; render(); $("list").children[i]?.querySelector(".freq")?.focus(); });

    const x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.textContent = "×";
    x.setAttribute("aria-label", t("removeAria", label(it)));
    x.addEventListener("click", () => removeItem(i));

    row.append(check, name, amt, fq, x);
    list.append(row);
  });
  $("empty").hidden = state.items.length > 0;
  renderCurrency();
  update();
}

function update() {
  const spent = state.items.reduce((s, it) => s + monthly(it), 0);
  document.querySelectorAll(".hint").forEach(h => {
    const it = state.items[h.dataset.i];
    h.textContent = it && it.daily ? `${fmt(it.amount)} × ${state.days} = ${fmt(monthly(it))}` : "";
  });
  document.querySelectorAll("#days button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.days === state.days)));

  const salary = state.salary;
  const left = salary - spent;
  const pct = salary ? (spent / salary) * 100 : 0;
  $("spent").textContent = fmt(spent);
  $("left").textContent = fmt(left);
  $("leftBox").className = "fig" + (!salary ? "" : left < 0 ? " neg" : " pos");
  $("fill").style.width = (salary ? Math.min(pct, 100) : 0) + "%";
  $("bar").classList.toggle("over", pct > 100);
  $("bar").classList.toggle("high", pct > 85 && pct <= 100);
  const paid = state.items.filter(it => it.done);
  const toPay = state.items.reduce((s, it) => s + (it.done ? 0 : monthly(it)), 0);
  $("paid").textContent = state.items.length
    ? `${t("paid", paid.length, state.items.length)} · ${toPay > 0 ? t("toPay", fmt(toPay)) : t("allDone")}`
    : "";
  $("pct").textContent = salary
    ? (pct > 100 ? t("over", fmt(-left)) : t("pctSpent", pct.toLocaleString(I18N[lang].locale, { maximumFractionDigits: 1 })))
    : t("enterSalary");
  save();
}

/* ---------- Currency ---------- */

const known = () => [...$("currencySel").options].map(o => o.value).filter(v => v !== "other");

function renderCurrency() {
  const cur = state.currency;
  const isKnown = known().includes(cur);
  $("currencySel").value = isKnown ? cur : "other";
  $("currencyOther").hidden = isKnown;
  if (!isKnown && document.activeElement !== $("currencyOther")) $("currencyOther").value = cur;
  $("salaryUnit").textContent = cur;
  $("subtitle").textContent = t("subtitle", cur);
}

$("currencySel").addEventListener("change", e => {
  if (e.target.value === "other") {
    $("currencyOther").hidden = false;
    $("currencyOther").value = known().includes(state.currency) ? "" : state.currency;
    $("currencyOther").focus();
    return;
  }
  state.currency = e.target.value;
  renderCurrency(); update();
});
$("currencyOther").addEventListener("input", e => {
  state.currency = e.target.value.trim() || DEFAULT_CURRENCY;
  $("salaryUnit").textContent = state.currency;
  $("subtitle").textContent = t("subtitle", state.currency);
  update();
});
$("currencyOther").addEventListener("blur", e => {
  // Nothing typed: fall back to DH
  if (!e.target.value.trim()) { state.currency = DEFAULT_CURRENCY; renderCurrency(); update(); }
});

/* ---------- Salary, days ---------- */

$("salary").addEventListener("input", e => { state.salary = num(e.target.value); update(); });
$("days").addEventListener("click", e => {
  const b = e.target.closest("button[data-days]");
  if (b) { state.days = +b.dataset.days; update(); }
});

/* ---------- Add / remove ---------- */

$("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("newTitle").value.trim();
  $("newTitle").classList.toggle("err", !title);
  if (!title) { $("msg").textContent = t("errTitle"); $("newTitle").focus(); return; }
  $("msg").textContent = "";
  state.items.push({ title, amount: num($("newAmt").value), custom: true, daily: $("newFreq").value === "day" });
  $("newTitle").value = ""; $("newAmt").value = "";
  saveDraft();
  render();
  $("newTitle").blur(); $("newAmt").blur();
});
$("newTitle").addEventListener("input", () => { $("newTitle").classList.remove("err"); $("msg").textContent = ""; });
$("newTitle").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("newAmt").focus(); } });

let undoTimer, lastRemoved = null;
function removeItem(i) {
  const [it] = state.items.splice(i, 1);
  lastRemoved = { it, i };
  render();
  $("toastMsg").textContent = t("removed", label(it));
  $("toast").hidden = false;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { $("toast").hidden = true; lastRemoved = null; }, 5000);
}
$("undo").addEventListener("click", () => {
  if (lastRemoved) { state.items.splice(Math.min(lastRemoved.i, state.items.length), 0, lastRemoved.it); lastRemoved = null; render(); }
  $("toast").hidden = true;
});

// Keep the unsent expense draft
try { const d = JSON.parse(localStorage.getItem(DRAFT)) || {}; $("newTitle").value = d.title || ""; $("newAmt").value = d.amount || ""; } catch (e) {}
function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify({ title: $("newTitle").value, amount: $("newAmt").value })); } catch (e) {} }
$("newTitle").addEventListener("input", saveDraft);
$("newAmt").addEventListener("input", saveDraft);

let armed = false, armTimer;
$("reset").addEventListener("click", () => {
  if (!armed) {
    armed = true; $("reset").textContent = t("resetConfirm");
    armTimer = setTimeout(() => { armed = false; $("reset").textContent = t("reset"); }, 3000);
    return;
  }
  clearTimeout(armTimer);
  armed = false; $("reset").textContent = t("reset");
  // Keep the user's display preferences, reset the numbers
  state = { ...fresh(), days: state.days, currency: state.currency };
  render();
});

/* ---------- Theme: system → light → dark ---------- */

const THEMES = ["auto", "light", "dark"];
let theme = document.documentElement.dataset.theme || "auto";
const media = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const btn = $("theme");
  btn.dataset.mode = theme;
  btn.setAttribute("aria-label", btn.title = t("theme", t("themes")[theme]));
  // Match the phone's status bar to the page
  requestAnimationFrame(() => $("themeColor").setAttribute("content", getComputedStyle(document.body).backgroundColor));
}
$("theme").addEventListener("click", () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  try { theme === "auto" ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  applyTheme();
});
media.addEventListener?.("change", () => { if (theme === "auto") applyTheme(); });
applyTheme();

/* ---------- Install as an app (Android / desktop Chrome) ---------- */

let deferredPrompt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; $("install").hidden = false; });
$("install").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => {});
  deferredPrompt = null; $("install").hidden = true;
});
addEventListener("appinstalled", () => { $("install").hidden = true; });

/* ---------- Language switch ---------- */

function applyLang() {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = I18N[lang].dir;
  document.title = t("appTitle");
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  [...$("currencySel").options].forEach(o => { if (o.value !== "other") o.textContent = `${o.value} — ${t("cur")[o.value]}`; });
  $("lang").value = lang;
  $("lang").setAttribute("aria-label", t("language"));
  if (!armed) $("reset").textContent = t("reset");
  applyTheme();
  render();
}
$("lang").addEventListener("change", e => {
  lang = I18N[e.target.value] ? e.target.value : "en";
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  applyLang();
});

// The app may stay open across the 1st of the month
const checkMonth = () => { if (rollMonth()) render(); };
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkMonth(); });
addEventListener("focus", checkMonth);
setInterval(checkMonth, 60 * 1000);

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

applyLang();
