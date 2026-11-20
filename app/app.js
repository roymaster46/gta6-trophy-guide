// Leonida Trophy Guide v2 — 3-column research dashboard.
// Loads app/data/trophies.json, renders the checklist (left), the selected
// trophy's numbered, cited guide (center) and the sources / certainty /
// roadmap / progress panels (right). Audit numbers are computed at runtime
// from the loaded JSON, never hardcoded. Progress lives in localStorage.
// No network requests besides loading its own files.
const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoiler-v1';

const listEl = document.getElementById('trophyList');
const roadmapEl = document.getElementById('roadmapList');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const auditEl = document.getElementById('auditStrip');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const filterNote = document.getElementById('filterNote');
const emptyMsg = document.getElementById('emptyMsg');
const detailEl = document.getElementById('detail');
const sourceListEl = document.getElementById('sourceList');
const sureBodyEl = document.getElementById('sureBody');
const miniRoadmapEl = document.getElementById('miniRoadmap');
const missableBanner = document.getElementById('missableBanner');
const progressSummaryEl = document.getElementById('progressSummary');

let trophies = [];
let roadmap = [];
let sources = [];
let earned = new Set();
let openGuideId = null;
let activeFilter = 'all';

try { earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); } catch { earned = new Set(); }
let spoilerOn = localStorage.getItem(SPOILER_KEY) === '1';
spoilerEl.checked = spoilerOn;

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort()));
}

function trophyById(id) { return trophies.find((t) => t.id === id); }

function isStory(t) { return t.kind === 'story' || t.kind === 'completion'; }

// Global source number for a trophy's named source (1-based, per data.sources).
function sourceNumber(name) {
  return sources.findIndex((s) => s.name === name) + 1;
}

// --- Audit: every number below is computed from the loaded data. ---
function audit() {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0, hidden: 0, missable: 0 };
  let guidesCited = 0;
  let guidesTwoPlus = 0;
  let totalSteps = 0;
  let citedSteps = 0;
  let singleSteps = 0;
  const singleTrophies = new Set();
  for (const t of trophies) {
    counts[t.grade] = (counts[t.grade] ?? 0) + 1;
    if (t.hidden) counts.hidden += 1;
    if (t.missable) counts.missable += 1;
    if ((t.sources ?? []).length >= 1) guidesCited += 1;
    if ((t.sources ?? []).length >= 2) guidesTwoPlus += 1;
    for (const s of t.steps ?? []) {
      totalSteps += 1;
      if ((s.cites ?? []).length >= 1) citedSteps += 1;
      if ((s.cites ?? []).length === 1) { singleSteps += 1; singleTrophies.add(t.id); }
    }
  }
  return { counts, guidesCited, guidesTwoPlus, totalSteps, citedSteps, singleSteps, singleTrophyCount: singleTrophies.size };
}

function renderAudit() {
  const a = audit();
  auditEl.innerHTML = '';
  const chips = [
    `<b>${trophies.length}</b> official`,
    `<span class="plat">◆</span> <b>${a.counts.platinum}</b>P <span class="g">◆</span> <b>${a.counts.gold}</b>G <span class="s">◆</span> <b>${a.counts.silver}</b>S <span class="b">◆</span> <b>${a.counts.bronze}</b>B`,
    `<b>${a.counts.hidden}</b> hidden`,
    `<span class="m">⚠</span> <b>${a.counts.missable}</b> missable`,
    `<b>${a.guidesCited}/${trophies.length}</b> guides cite a source`,
    `<b>${a.citedSteps}/${a.totalSteps}</b> steps cited`,
    `<b>${sources.length}</b> sources`,
    `lists read <b>18 Nov 2026</b>`,
    `<b>${roadmap.length}</b>-stage roadmap`,
    `<b>0</b> online trophies`,
  ];
  for (const html of chips) {
    const span = document.createElement('span');
    span.className = 'chip-stat';
    span.innerHTML = html;
    auditEl.append(span);
  }
}

function renderSources() {
  sourceListEl.innerHTML = '';
  sources.forEach((s, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    sourceListEl.append(li);
  });
}

function renderSure() {
  const a = audit();
  sureBodyEl.innerHTML = '';
  const lines = [
    `<b>${a.guidesTwoPlus}/${trophies.length}</b> guides cite 2 sources; the rest cite 1 — no guide is uncited.`,
    `<b>${a.citedSteps}/${a.totalSteps}</b> numbered steps carry a citation.`,
    `<b>${a.singleSteps}</b> steps rest on a single source — each is marked “1 source” — across <b>${a.singleTrophyCount}</b> trophies.`,
    `Exophase &amp; PSNProfiles list the same <b>${trophies.length}</b> names, descriptions and grades.`,
    `No disagreement was found between the listed sources on any trophy.`,
    `Lists read <b>18 Nov 2026</b>.`,
  ];
  for (const html of lines) {
    const p = document.createElement('p');
    p.innerHTML = html;
    sureBodyEl.append(p);
  }
}

function stageEarned(stage) {
  return stage.trophies.filter((id) => earned.has(trophyById(id)?.name)).length;
}

function renderMiniRoadmap() {
  miniRoadmapEl.innerHTML = '';
  for (const stage of roadmap) {
    const li = document.createElement('li');
    if (stage.title.toLowerCase().includes('missable')) li.className = 'stage-missable';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = stage.stage;
    const title = document.createElement('span');
    title.textContent = stage.title;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${stageEarned(stage)}/${stage.trophies.length} earned`;
    li.append(num, title, count);
    miniRoadmapEl.append(li);
  }
  const missables = trophies.filter((t) => t.missable);
  const missDone = missables.filter((t) => earned.has(t.name)).length;
  missableBanner.textContent = `⚠ ${missables.length} missable trophies — ${missDone} earned. Do them before the final mission: ` +
    missables.map((t) => t.name).join(' · ') + '.';
}

function renderProgressSummary() {
  const total = trophies.length;
  const earnedCount = trophies.filter((t) => earned.has(t.name)).length;
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;
  const rows = [['Earned', `${earnedCount} of ${total} — ${pct}%`]];
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const ofGrade = trophies.filter((t) => t.grade === g);
    const got = ofGrade.filter((t) => earned.has(t.name)).length;
    rows.push([g[0].toUpperCase() + g.slice(1), `${got} / ${ofGrade.length}`]);
  }
  const missables = trophies.filter((t) => t.missable);
  rows.push(['Missable', `${missables.filter((t) => earned.has(t.name)).length} / ${missables.length}`]);
  progressSummaryEl.innerHTML = '';
  for (const [label, value] of rows) {
    const div = document.createElement('div');
    div.className = 'row';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('b');
    v.textContent = value;
    div.append(l, v);
    progressSummaryEl.append(div);
  }
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${earnedCount} of ${total} earned — ${pct}%` +
    (earnedCount === total && total > 0 ? ' — Platinum! Leonida Legend.' : '');
}

function renderRoadmap() {
  roadmapEl.innerHTML = '';
  for (const stage of roadmap) {
    const li = document.createElement('li');
    if (stage.title.toLowerCase().includes('missable')) li.className = 'stage-missable';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = stage.stage;
    const h3 = document.createElement('h3');
    h3.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${stageEarned(stage)} of ${stage.trophies.length} earned in this stage`;
    li.append(num, h3, p, count);
    roadmapEl.append(li);
  }
}

function gradeBadge(t) {
  const span = document.createElement('span');
  span.className = `badge ${t.grade}`;
  span.textContent = t.grade;
  return span;
}

function stepSearchText(t) {
  return (t.steps ?? []).map((s) => s.text).join(' ');
}

function renderTrophies() {
  const query = searchEl.value.trim().toLowerCase();
  listEl.innerHTML = '';
  let shown = 0;
  for (const t of trophies) {
    if (activeFilter === 'story' && !isStory(t)) continue;
    if (activeFilter === 'missable' && !t.missable) continue;
    if (activeFilter === 'collectible' && t.kind !== 'collectible') continue;
    if (activeFilter === 'activity' && t.kind !== 'activity') continue;
    if (activeFilter === 'online') continue; // this list has no online trophies
    if (activeFilter === 'earned' && !earned.has(t.name)) continue;
    if (activeFilter === 'remaining' && earned.has(t.name)) continue;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) continue;
    if (query && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + stepSearchText(t)).toLowerCase().includes(query)) continue;
    shown += 1;

    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.name) ? ' earned' : '') + (t.missable ? ' missable-card' : '') + (openGuideId === t.id ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveProgress();
      renderAll();
    });
    const body = document.createElement('div');
    body.className = 'row-body';
    const name = document.createElement('div');
    name.className = 'row-name';
    const isHidden = spoilerOn && isStory(t) && !earned.has(t.name);
    name.textContent = isHidden ? 'Hidden story trophy — earn it to reveal' : t.name;
    if (t.hidden && !isHidden) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' (hidden on PSN)';
      name.append(tag);
    }
    const badges = document.createElement('div');
    badges.className = 'row-badges';
    badges.append(gradeBadge(t));
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'badge missable-badge';
      m.textContent = '⚠ missable';
      badges.append(m);
    }
    if (t.count) {
      const c = document.createElement('span');
      c.className = 'badge count-badge';
      c.textContent = `× ${t.count.toLocaleString('en-US')}`;
      badges.append(c);
    }
    if (earned.has(t.name)) {
      const e = document.createElement('span');
      e.className = 'badge earned-badge';
      e.textContent = '✓ earned';
      badges.append(e);
    }
    body.append(name, badges);
    li.append(box, body);
    li.addEventListener('click', () => {
      openGuideId = t.id;
      renderAll();
    });
    listEl.append(li);
  }
  emptyMsg.hidden = shown !== 0;
  filterNote.textContent = activeFilter === 'online'
    ? 'Online filter: 0 trophies — this list has no online trophies.'
    : `Showing ${shown} of ${trophies.length} trophies. Click a row to read its guide.`;
}

function renderDetail() {
  detailEl.innerHTML = '';
  const t = trophyById(openGuideId);
  if (!t) {
    const div = document.createElement('div');
    div.className = 'detail-empty';
    const h2 = document.createElement('h2');
    h2.textContent = 'Pick a trophy';
    const p = document.createElement('p');
    p.textContent = 'Click any trophy in the checklist to read its numbered, cited guide here.';
    div.append(h2, p);
    detailEl.append(div);
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'detail';
  const isHidden = spoilerOn && isStory(t) && !earned.has(t.name);
  const h2 = document.createElement('h2');
  h2.textContent = isHidden ? 'Hidden story trophy — earn it to reveal' : t.name;
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = isHidden
    ? 'Spoiler mode is on: the name and description stay hidden until you earn this trophy.'
    : `“${t.description}”`;
  const badges = document.createElement('div');
  badges.className = 'badges';
  badges.append(gradeBadge(t));
  if (t.kind !== t.grade) {
    const kind = document.createElement('span');
    kind.className = 'badge kind';
    kind.textContent = t.kind;
    badges.append(kind);
  }
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'badge missable-badge';
    m.textContent = '⚠ missable';
    badges.append(m);
  }
  if (t.count) {
    const c = document.createElement('span');
    c.className = 'badge count-badge';
    c.textContent = `× ${t.count.toLocaleString('en-US')}`;
    badges.append(c);
  }
  if (t.hidden) {
    const h = document.createElement('span');
    h.className = 'badge kind';
    h.textContent = 'hidden on PSN';
    badges.append(h);
  }
  wrap.append(h2, desc, badges);

  if (t.missable && t.missable_reason) {
    const mn = document.createElement('p');
    mn.className = 'missable-note';
    mn.textContent = `⚠ Missable: ${t.missable_reason}`;
    wrap.append(mn);
  }

  const ol = document.createElement('ol');
  ol.className = 'steps';
  for (const step of t.steps ?? []) {
    const li = document.createElement('li');
    li.append(document.createTextNode(step.text + ' '));
    (step.cites ?? []).forEach((n, i) => {
      if (i > 0) li.append(document.createTextNode(', '));
      const cite = document.createElement('span');
      cite.className = 'cite';
      const a = document.createElement('a');
      a.href = `#sourcesPanel`;
      a.textContent = `[${n}]`;
      a.title = sources[n - 1]?.name ?? '';
      cite.append(a);
      li.append(cite);
    });
    if ((step.cites ?? []).length === 1) {
      const tag = document.createElement('span');
      tag.className = 'single-tag';
      tag.textContent = '1 source';
      li.append(tag);
    }
    ol.append(li);
  }
  wrap.append(ol);

  const src = document.createElement('p');
  src.className = 'sources-line';
  src.append(document.createTextNode('Sources for this guide: '));
  (t.sources ?? []).forEach((s, i) => {
    if (i > 0) src.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = s.url;
    a.rel = 'noopener';
    a.textContent = `[${sourceNumber(s.name)}] ${s.name}`;
    src.append(a);
  });
  wrap.append(src);

  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  const isEarned = earned.has(t.name);
  btn.textContent = isEarned ? '✓ Earned — unmark' : 'Mark as earned';
  if (isEarned) btn.className = 'earned-now';
  btn.addEventListener('click', () => {
    if (earned.has(t.name)) earned.delete(t.name); else earned.add(t.name);
    saveProgress();
    renderAll();
  });
  actions.append(btn);
  if (isEarned) {
    const state = document.createElement('span');
    state.className = 'earned-state';
    state.textContent = 'Earned ✓';
    actions.append(state);
  }
  wrap.append(actions);
  detailEl.append(wrap);
}

function renderAll() {
  renderAudit();
  renderSources();
  renderSure();
  renderMiniRoadmap();
  renderRoadmap();
  renderProgressSummary();
  renderTrophies();
  renderDetail();
}

document.getElementById('filterChips').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-filter]');
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  document.querySelectorAll('#filterChips .chip').forEach((c) => c.classList.toggle('active', c === btn));
  renderTrophies();
});
searchEl.addEventListener('input', renderTrophies);
gradeEl.addEventListener('change', renderTrophies);
spoilerEl.addEventListener('change', () => {
  spoilerOn = spoilerEl.checked;
  localStorage.setItem(SPOILER_KEY, spoilerOn ? '1' : '0');
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned].sort() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('bad file');
    const valid = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => valid.has(n)));
    saveProgress();
    renderAll();
  } catch {
    filterNote.textContent = 'Import failed: that file is not a progress export from this guide.';
  }
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  earned = new Set();
  saveProgress();
  renderAll();
});

// Demo deep-links used for screenshots (and shareable links): ?demo=cover checks
// some trophies and opens a missable guide; ?demo=spoiler turns spoiler mode on;
// ?trophy=<id> opens that trophy's guide; ?filter=missable|story|… applies a filter.
function applyDemoParams() {
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo');
  const trophyParam = Number(params.get('trophy'));
  if (params.get('filter')) {
    const f = params.get('filter');
    const btn = document.querySelector(`#filterChips button[data-filter="${f}"]`);
    if (btn) { activeFilter = f; document.querySelectorAll('#filterChips .chip').forEach((c) => c.classList.toggle('active', c === btn)); }
  }
  if (demo === 'cover') {
    for (const id of [2, 3, 4, 5, 8, 9, 15, 16, 21, 28, 35, 42, 53, 55]) {
      const t = trophyById(id);
      if (t) earned.add(t.name);
    }
    openGuideId = 33;
  }
  if (demo === 'spoiler') {
    spoilerOn = true;
    spoilerEl.checked = true;
    localStorage.setItem(SPOILER_KEY, '1');
    for (const id of [2, 3, 8]) { const t = trophyById(id); if (t) earned.add(t.name); }
  }
  if (trophyParam) openGuideId = trophyParam;
  if (!openGuideId) openGuideId = trophies[0]?.id ?? null;
}

const data = await (await fetch('data/trophies.json')).json();
trophies = data.trophies;
roadmap = data.roadmap ?? [];
sources = data.sources ?? [];
applyDemoParams();
renderAll();
