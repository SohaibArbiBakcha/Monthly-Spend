const DEFAULTS = [
  { title: "Rent", amount: 3500 },
  { title: "Groceries", amount: 1800 },
  { title: "Transport", amount: 20, daily: true },
  { title: "Coffee & snacks", amount: 15, daily: true },
  { title: "Electricity & water", amount: 350 },
  { title: "Internet & phone", amount: 250 },
];
const DEFAULT_CURRENCY = "DH";
// Symbols written before the number ($120); everything else goes after (120 DH)
const PREFIX = new Set(["$", "€", "£", "¥", "₹", "CA$"]);
const DAYS = [28, 29, 30, 31];
const KEY = "monthly-spend-v1";
const THEME_KEY = "monthly-spend-theme";
const DRAFT = "monthly-spend-draft";

const $ = id => document.getElementById(id);
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const defaultItems = () => DEFAULTS.map(d => ({ title: d.title, amount: d.amount, daily: !!d.daily, custom: false, done: false }));
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
      .map(it => ({ title: it.title.trim().slice(0, 40), amount: num(it.amount), daily: !!it.daily, custom: !!it.custom, done: !!it.done })),
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
  const s = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
    box.setAttribute("aria-label", `${it.title} paid this month`);
    box.addEventListener("change", () => { it.done = box.checked; row.classList.toggle("done", it.done); update(); });
    check.append(box);

    const name = document.createElement("span");
    name.className = "name";
    const title = document.createElement("span");
    title.className = "title"; title.textContent = it.title;
    name.append(title);
    if (it.custom) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "custom"; name.append(t); }
    const hint = document.createElement("span");
    hint.className = "hint"; hint.dataset.i = i;
    name.append(hint);

    const amt = document.createElement("input");
    amt.type = "number"; amt.min = "0"; amt.step = "any"; amt.className = "amt";
    amt.inputMode = "decimal"; amt.enterKeyHint = "done";
    amt.id = "amt-" + i; amt.value = it.amount || ""; amt.placeholder = "0";
    amt.setAttribute("aria-label", it.title + " amount");
    amt.addEventListener("input", () => { it.amount = num(amt.value); update(); });

    const fq = document.createElement("button");
    fq.type = "button"; fq.className = "freq" + (it.daily ? " on" : "");
    fq.textContent = it.daily ? "/ day" : "/ mo";
    fq.setAttribute("aria-label", `${it.title}: ${it.daily ? "per day" : "per month"}, tap to switch`);
    fq.addEventListener("click", () => { it.daily = !it.daily; render(); $("list").children[i]?.querySelector(".freq")?.focus(); });

    const x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.textContent = "×";
    x.setAttribute("aria-label", "Remove " + it.title);
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
    ? `Paid ${paid.length} of ${state.items.length}` + (toPay > 0 ? ` · ${fmt(toPay)} still to pay` : " · all done ✓")
    : "";
  $("pct").textContent = salary
    ? (pct > 100 ? `Over budget by ${fmt(-left)}` : `${pct.toFixed(1)}% of salary spent`)
    : "Enter your salary to see what's left";
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
  $("subtitle").textContent = `Salary and expenses, in ${cur}.`;
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
  $("subtitle").textContent = `Salary and expenses, in ${state.currency}.`;
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
  if (!title) { $("msg").textContent = "Give the expense a title first."; $("newTitle").focus(); return; }
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
  $("toastMsg").textContent = `Removed “${it.title}”`;
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
    armed = true; $("reset").textContent = "Tap again to confirm";
    armTimer = setTimeout(() => { armed = false; $("reset").textContent = "Reset to defaults"; }, 3000);
    return;
  }
  clearTimeout(armTimer);
  armed = false; $("reset").textContent = "Reset to defaults";
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
  const label = { auto: "system", light: "light", dark: "dark" }[theme];
  btn.setAttribute("aria-label", `Theme: ${label}. Tap to change`);
  btn.title = `Theme: ${label}`;
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

// The app may stay open across the 1st of the month
const checkMonth = () => { if (rollMonth()) render(); };
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkMonth(); });
addEventListener("focus", checkMonth);
setInterval(checkMonth, 60 * 1000);

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

render();
