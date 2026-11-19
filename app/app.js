// Leonida Trophy Guide: loads app/data/trophies.json, renders the roadmap and the
// checklist, saves progress in localStorage, and offers filters, spoiler mode,
// export and import. No network requests besides loading its own files.
const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoiler-v1';

const listEl = document.getElementById('trophyList');
const roadmapEl = document.getElementById('roadmapList');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statsEl = document.getElementById('stats');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const filterNote = document.getElementById('filterNote');
const emptyMsg = document.getElementById('emptyMsg');
const missableBanner = document.getElementById('missableBanner');

let trophies = [];
let roadmap = [];
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

function renderStats() {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0, hidden: 0, missable: 0 };
  for (const t of trophies) {
    counts[t.grade] = (counts[t.grade] ?? 0) + 1;
    if (t.hidden) counts.hidden += 1;
    if (t.missable) counts.missable += 1;
  }
  const earnedCount = trophies.filter((t) => earned.has(t.name)).length;
  statsEl.innerHTML = '';
  const items = [
    `<b>${trophies.length}</b> trophies`,
    `<span class="plat">◆</span> <b>${counts.platinum}</b> platinum`,
    `<span class="g">◆</span> <b>${counts.gold}</b> gold`,
    `<span class="s">◆</span> <b>${counts.silver}</b> silver`,
    `<span class="b">◆</span> <b>${counts.bronze}</b> bronze`,
    `<b>${counts.hidden}</b> hidden`,
    `<span class="m">⚠</span> <b>${counts.missable}</b> missable`,
    `<b>${earnedCount}</b> earned by you`,
  ];
  for (const html of items) {
    const span = document.createElement('span');
    span.className = 'stat';
    span.innerHTML = html;
    statsEl.append(span);
  }
}

function renderRoadmap() {
  roadmapEl.innerHTML = '';
  for (const stage of roadmap) {
    const li = document.createElement('li');
    if (stage.title.toLowerCase().includes('missable')) li.className = 'stage-missable';
    const done = stage.trophies.filter((id) => earned.has(trophyById(id)?.name)).length;
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = stage.stage;
    const h3 = document.createElement('h3');
    h3.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${done} of ${stage.trophies.length} earned in this stage`;
    li.append(num, h3, p, count);
    roadmapEl.append(li);
  }
  const missables = trophies.filter((t) => t.missable);
  const missDone = missables.filter((t) => earned.has(t.name)).length;
  missableBanner.textContent = `⚠ ${missables.length} missable trophies — ${missDone} earned. Do them before the final mission: ` +
    missables.map((t) => t.name).join(' · ') + '.';
}

function gradeBadge(t) {
  const span = document.createElement('span');
  span.className = `badge ${t.grade}`;
  span.textContent = t.grade;
  return span;
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
    if (query && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(query)) continue;
    shown += 1;

    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.name) ? ' earned' : '') + (t.missable ? ' missable-card' : '');
    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveProgress();
      renderAll();
    });
    const titleBox = document.createElement('div');
    titleBox.className = 'trophy-title';
    const h3 = document.createElement('h3');
    const isHidden = spoilerOn && isStory(t) && !earned.has(t.name);
    h3.textContent = isHidden ? 'Hidden story trophy — earn it to reveal' : t.name;
    if (t.hidden && !isHidden) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' (hidden on PSN)';
      h3.append(tag);
    }
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = isHidden ? 'Spoiler mode is on: the name and description stay hidden until you earn this trophy.' : t.description;
    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.append(gradeBadge(t));
    const kind = document.createElement('span');
    kind.className = 'badge kind';
    kind.textContent = t.kind;
    badges.append(kind);
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
    titleBox.append(h3, desc, badges);
    head.append(box, titleBox);
    li.append(head);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    toggle.textContent = openGuideId === t.id ? 'Hide guide ▲' : 'Show guide ▼';
    toggle.addEventListener('click', () => {
      openGuideId = openGuideId === t.id ? null : t.id;
      renderTrophies();
    });
    li.append(toggle);

    if (openGuideId === t.id) {
      const guide = document.createElement('div');
      guide.className = 'guide';
      if (t.missable && t.missable_reason) {
        const mn = document.createElement('p');
        mn.className = 'missable-note';
        mn.textContent = `⚠ Missable: ${t.missable_reason}`;
        guide.append(mn);
      }
      const p = document.createElement('p');
      p.textContent = t.guide;
      guide.append(p);
      const src = document.createElement('p');
      src.className = 'sources';
      src.append(document.createTextNode('Sources: '));
      (t.sources ?? []).forEach((s, i) => {
        if (i > 0) src.append(document.createTextNode(' · '));
        const a = document.createElement('a');
        a.href = s.url;
        a.rel = 'noopener';
        a.textContent = s.name;
        src.append(a);
      });
      guide.append(src);
      li.append(guide);
    }
    listEl.append(li);
  }
  emptyMsg.hidden = shown !== 0;
  const total = trophies.length;
  const earnedCount = trophies.filter((t) => earned.has(t.name)).length;
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${earnedCount} of ${total} earned — ${pct}%` +
    (earnedCount === total && total > 0 ? ' — Platinum! Leonida Legend.' : '');
  filterNote.textContent = activeFilter === 'online'
    ? 'Online filter: 0 trophies — this list has no online trophies.'
    : `Showing ${shown} of ${total} trophies.`;
}

function renderAll() {
  renderStats();
  renderRoadmap();
  renderTrophies();
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
  renderTrophies();
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
}

const data = await (await fetch('data/trophies.json')).json();
trophies = data.trophies;
roadmap = data.roadmap ?? [];
applyDemoParams();
renderAll();
