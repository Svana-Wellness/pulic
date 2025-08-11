
function getDayOverride() {
  const p = new URLSearchParams(location.search);
  const d = p.get("day");
  return d ? Math.max(1, parseInt(d, 10)) : null; // 1-based
}

function computeDayIndexTZ(startISO, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startISO);
  if (!m) return 0;
  const yStart = parseInt(m[1], 10);
  const moStart = parseInt(m[2], 10);
  const dStart = parseInt(m[3], 10);

  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const yToday = parseInt(map.year, 10);
  const moToday = parseInt(map.month, 10);
  const dToday = parseInt(map.day, 10);

  const startUTCdays = Date.UTC(yStart, moStart - 1, dStart) / 86400000;
  const todayUTCdays = Date.UTC(yToday, moToday - 1, dToday) / 86400000;
  return Math.floor(todayUTCdays - startUTCdays);
}

async function loadData() {
  const res = await fetch("videos.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("videos.json not found");
  return res.json();
}

function clamp(i, min, max) { return Math.max(min, Math.min(max, i)); }

function setMeta(id, item) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!item || !item.yt) {
    el.textContent = "No video";
    return;
  }
  const len = item.length ? ` · ${item.length}` : "";
  el.textContent = `${item.title}${len}`;
}

function openPlayer(item) {
  if (!item || !item.yt) return;
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("ytFrame");
  const title = document.getElementById("playerTitle");

  title.textContent = item.title || "Now Playing";
  frame.src = `https://www.youtube.com/embed/${item.yt}?autoplay=1&rel=0`;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closePlayer() {
  const modal = document.getElementById("playerModal");
  const frame = document.getElementById("ytFrame");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  frame.src = "";
}

function attachCloseHandlers() {
  document.querySelectorAll("[data-close]").forEach(b => {
    b.addEventListener("click", closePlayer);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayer();
  });
}

function labelDay(dayIdx) {
  const el = document.getElementById("dayLabel");
  if (el) el.textContent = `Day ${dayIdx + 1}`;
}

(async function init() {
  try {
    const data = await loadData();
    const override = getDayOverride();
    const tz = "Asia/Kolkata";
    let dayIdx = override ? (override - 1) : computeDayIndexTZ(data.campaignStartDate, tz);
    const last = Math.min(
      data.morning?.length || 0,
      data.breathwork?.length || 0,
      data.meditation?.length || 0,
      data.spiritual?.length || 0
    ) - 1;
    dayIdx = clamp(dayIdx, 0, Math.max(0, last));
    labelDay(dayIdx);

    const todays = {
      morning: data.morning?.[dayIdx],
      breathwork: data.breathwork?.[dayIdx],
      meditation: data.meditation?.[dayIdx],
      spiritual: data.spiritual?.[dayIdx],
    };

    setMeta("morningMeta", todays.morning);
    setMeta("breathworkMeta", todays.breathwork);
    setMeta("meditationMeta", todays.meditation);
    setMeta("spiritualMeta", todays.spiritual);

    const tileMorning = document.getElementById("tile-morning");
    const tileBreath = document.getElementById("tile-breathwork");
    const tileMed = document.getElementById("tile-meditation");
    const tileSpirit = document.getElementById("tile-spiritual");

    if (tileMorning) tileMorning.addEventListener("click", e => { e.preventDefault(); openPlayer(todays.morning); });
    if (tileBreath) tileBreath.addEventListener("click", e => { e.preventDefault(); openPlayer(todays.breathwork); });
    if (tileMed) tileMed.addEventListener("click", e => { e.preventDefault(); openPlayer(todays.meditation); });
    if (tileSpirit) tileSpirit.addEventListener("click", e => { e.preventDefault(); openPlayer(todays.spiritual); });

    attachCloseHandlers();
    window._svanaData = data;
    window._svanaDayIdx = dayIdx;
  } catch (err) {
    console.error(err);
    alert("Error loading videos.");
  }
})();

// Past page helper
window.renderPast = function () {
  const data = window._svanaData;
  const todayIdx = window._svanaDayIdx || 0;
  if (!data) return;

  const root = document.getElementById("pastList");
  const days = Array.from({ length: todayIdx + 1 }, (_, i) => i);

  const sections = [
    { key: "morning", label: "Morning Yoga" },
    { key: "breathwork", label: "Breathwork" },
    { key: "meditation", label: "Meditation" },
    { key: "spiritual", label: "Spiritual Talks" }
  ];

  sections.forEach(sec => {
    const wrap = document.createElement("section");
    wrap.className = "past-section";
    const h = document.createElement("h2");
    h.textContent = sec.label;
    wrap.appendChild(h);

    const list = document.createElement("div");
    list.className = "past-grid";
    days.forEach(d => {
      const arr = data[sec.key] || [];
      const item = arr[d];
      if (!item) return;
      const card = document.createElement("button");
      card.className = "past-card";
      const len = item.length ? `<small>${item.length}</small>` : "";
      card.innerHTML = `<strong>Day ${d+1}</strong><div>${item.title}</div>${len}`;
      card.addEventListener("click", () => {
        const url = `https://www.youtube.com/embed/${item.yt}?autoplay=1&rel=0`;
        const w = 720, h = 405;
        const win = window.open("", "_blank", `width=${w},height=${h}`);
        win.document.write(`<title>${item.title}</title><iframe width="${w}" height="${h}" src="${url}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`);
      });
      list.appendChild(card);
    });

    wrap.appendChild(list);
    root.appendChild(wrap);
  });
};
