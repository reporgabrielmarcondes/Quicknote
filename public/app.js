const COLORS = ['pink', 'blue', 'purple', 'yellow', 'green', 'cyan'];
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const icon = (cls) => el('i', cls);
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

/*STORE*/
const req = async (url, method = 'GET', data) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
  return r.status === 204 ? null : r.json();
};
const store = {
  notebooks: () => req('/api/notebooks'),
  saveNotebook: (d, id) => req(id ? `/api/notebooks/${id}` : '/api/notebooks', id ? 'PUT' : 'POST', d),
  deleteNotebook: (id) => req(`/api/notebooks/${id}`, 'DELETE'),
  notes: (q, nb) => req(`/api/notes?q=${encodeURIComponent(q)}${nb ? '&notebook_id=' + nb : ''}`),
  saveNote: (d, id) => req(id ? `/api/notes/${id}` : '/api/notes', id ? 'PUT' : 'POST', d),
  deleteNote: (id) => req(`/api/notes/${id}`, 'DELETE'),
};
/*END*/

const S = { view: 'notes', nbs: [], notes: [], filter: null };
let imgs = [], editing = null, editingNb = null, color = COLORS[0], nbColor = COLORS[0], pickNb = null;
const run = async (fn) => { try { await fn(); } catch (e) { alert(e.message || 'Erro'); } };

/* ---------- toque longo ---------- */
function attachPress(node, onTap, onHold) {
  let timer, sx, sy, fired = false;
  const cancel = () => { clearTimeout(timer); node.classList.remove('pressing'); };
  node.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    fired = false; sx = e.clientX; sy = e.clientY;
    node.classList.add('pressing');
    timer = setTimeout(() => {
      fired = true; node.classList.remove('pressing');
      if (navigator.vibrate) navigator.vibrate(15);
      onHold();
    }, 500);
  });
  node.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) cancel(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => node.addEventListener(ev, cancel));
  node.addEventListener('contextmenu', (e) => { e.preventDefault(); onHold(); });
  node.addEventListener('click', () => { if (fired) { fired = false; return; } onTap(); });
}

/* ---------- renderização ---------- */
function renderChips() {
  const box = $('chips'); box.replaceChildren();
  const mk = (label, id, c) => {
    const b = el('button', 'chip'); b.type = 'button';
    b.setAttribute('aria-pressed', String(S.filter === id));
    if (c) { const d = el('span', 'dot-sm'); d.style.setProperty('--c', `var(--${c})`); b.append(d); }
    b.append(label);
    b.onclick = () => { S.filter = id; refresh(); };
    box.append(b);
  };
  mk('Todos', null);
  S.nbs.forEach((b) => mk(b.name, b.id, b.color));
}

function renderNotes() {
  const list = $('list'); list.replaceChildren();
  $('empty').hidden = S.notes.length > 0;
  for (const n of S.notes) {
    const card = el('button', 'note'); card.type = 'button';
    const d = el('span', 'dot'); d.style.setProperty('--c', `var(--${n.color})`);
    if (n.images && n.images.length) { const im = el('img', 'cover'); im.src = n.images[0]; im.alt = ''; im.loading = 'lazy'; card.append(im); }
    card.append(el('h3', '', n.title), el('p', '', n.content), d);
    attachPress(card, () => openSheet(n), () => openMenu('note', n));
    list.append(card);
  }
}

function renderNotebooks() {
  const box = $('nb-list'); box.replaceChildren();
  $('nb-empty').hidden = S.nbs.length > 0;
  for (const b of S.nbs) {
    const card = el('button', 'nb-card'); card.type = 'button';
    const ico = el('span', 'nb-ico'); ico.style.setProperty('--c', `var(--${b.color})`); ico.append(icon('fa-solid fa-book'));
    const meta = el('div', 'nb-meta'); meta.append(el('h3', '', b.name), el('p', '', plural(b.count, 'nota', 'notas')));
    card.append(ico, meta, icon('fa-solid fa-chevron-right'));
    attachPress(card, () => { S.filter = b.id; setView('notes'); }, () => openMenu('notebook', b));
    box.append(card);
  }
}

function setView(v) {
  S.view = v;
  $('view-notes').hidden = v !== 'notes';
  $('view-notebooks').hidden = v !== 'notebooks';
  $('screen-title').textContent = v === 'notes' ? 'Quicknote' : 'Cadernos';
  $('add').setAttribute('aria-label', v === 'notes' ? 'Nova nota' : 'Novo caderno');
  document.querySelectorAll('[data-nav]').forEach((b) => {
    if (b.dataset.nav === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  scrollTo(0, 0);
  refresh();
}
document.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => setView(b.dataset.nav); });

async function refresh() {
  try {
    S.nbs = await store.notebooks();
    if (S.filter && !S.nbs.some((b) => b.id === S.filter)) S.filter = null;
    S.notes = await store.notes($('q').value, S.filter);
    $('empty').textContent = 'Nenhuma nota aqui ainda.';
  } catch (e) {
    S.notes = []; $('empty').textContent = 'Não foi possível carregar as notas.';
  }
  renderChips(); renderNotes(); renderNotebooks();
}

/* ---------- seletores de cor e caderno ---------- */
function drawSwatches(box, current, onPick) {
  box.replaceChildren();
  for (const c of COLORS) {
    const b = el('button', 'swatch'); b.type = 'button';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', c); b.setAttribute('aria-checked', String(c === current));
    b.style.setProperty('--c', `var(--${c})`); b.append(icon('fa-solid fa-check'));
    b.onclick = () => { onPick(c); drawSwatches(box, c, onPick); };
    box.append(b);
  }
}
function drawPick() {
  const box = $('nb-pick'); box.replaceChildren();
  for (const b of S.nbs) {
    const c = el('button', 'chip'); c.type = 'button';
    c.setAttribute('role', 'radio'); c.setAttribute('aria-checked', String(b.id === pickNb));
    const d = el('span', 'dot-sm'); d.style.setProperty('--c', `var(--${b.color})`);
    c.append(d, b.name);
    c.onclick = () => { pickNb = b.id; drawPick(); };
    box.append(c);
  }
}

/* ---------- editor de nota ---------- */
const sheet = $('sheet');
function openSheet(n) {
  editing = n || null;
  color = n ? n.color : COLORS[0];
  pickNb = n ? n.notebook_id : (S.filter || (S.nbs[0] && S.nbs[0].id));
  $('sheet-title').textContent = n ? 'Editar nota' : 'Nova nota';
  $('title').value = n ? n.title : '';
  $('content').value = n ? n.content : '';
  $('del').hidden = !n;
  imgs = n && n.images ? [...n.images] : []; drawThumbs();
  drawPick(); drawSwatches($('colors'), color, (c) => { color = c; });
  sheet.hidden = false; $('title').focus();
}
const closeSheet = () => { sheet.hidden = true; };
$('form').onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    await store.saveNote({ title: $('title').value, content: $('content').value, color, notebook_id: pickNb, images: imgs }, editing && editing.id);
    closeSheet(); await refresh();
  });
};
$('close').onclick = closeSheet;
sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };
$('del').onclick = () => { if (editing) openMenu('note', editing, 'confirm'); };

/* ---------- fotos e desenho ---------- */
const MAX_IMGS = 4;
const viewer = $('viewer'), draw = $('draw'), cv = $('cv'), ctx = cv.getContext('2d');

function drawThumbs() {
  const box = $('thumbs'); box.replaceChildren(); box.hidden = imgs.length === 0;
  imgs.forEach((src, i) => {
    const t = el('div', 'thumb'), im = el('img');
    im.src = src; im.alt = `Anexo ${i + 1}`; im.onclick = () => openViewer(src);
    const x = el('button', 'thumb-x'); x.type = 'button'; x.setAttribute('aria-label', 'Remover imagem'); x.append(icon('fa-solid fa-xmark'));
    x.onclick = () => { imgs.splice(i, 1); drawThumbs(); };
    t.append(im, x); box.append(t);
  });
}
function addImage(src) {
  if (imgs.length >= MAX_IMGS) { alert(`Máximo de ${MAX_IMGS} imagens por nota`); return false; }
  imgs.push(src); drawThumbs(); return true;
}
const openViewer = (src) => { $('viewer-img').src = src; viewer.hidden = false; };
const closeViewer = () => { viewer.hidden = true; };
viewer.onclick = closeViewer;

function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1024 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.72));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem')); };
    im.src = url;
  });
}
$('photo').onclick = () => $('file').click();
$('file').onchange = (e) => {
  const files = [...e.target.files]; e.target.value = '';
  run(async () => { for (const f of files) if (!addImage(await shrink(f))) break; });
};

let strokes = [], cur = null, dpr = 1;
const pen = { color: '#141A3C', size: 4, erase: false };
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function paint() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width / dpr, cv.height / dpr);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(s.p[0][0], s.p[0][1]);
    if (s.p.length === 1) ctx.lineTo(s.p[0][0] + 0.01, s.p[0][1]);
    for (let i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i][0], s.p[i][1]);
    ctx.stroke();
  }
}
function drawTools() {
  const box = $('draw-tools'); box.replaceChildren();
  const swatch = (hex, label) => {
    const b = el('button', 'swatch'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', label);
    b.setAttribute('aria-checked', String(!pen.erase && pen.color === hex));
    b.style.setProperty('--c', hex); b.append(icon('fa-solid fa-check'));
    b.onclick = () => { pen.color = hex; pen.erase = false; drawTools(); };
    box.append(b);
  };
  swatch(css('--ink'), 'preto');
  COLORS.forEach((c) => swatch(css('--' + c), c));
  box.append(el('span', 'sep'));
  [3, 6, 12].forEach((sz) => {
    const b = el('button', 'tool'); b.type = 'button'; b.setAttribute('aria-label', `Espessura ${sz}`);
    b.setAttribute('aria-pressed', String(pen.size === sz));
    const d = el('span', 'bead'); d.style.width = d.style.height = Math.max(4, sz) + 'px'; b.append(d);
    b.onclick = () => { pen.size = sz; drawTools(); };
    box.append(b);
  });
  box.append(el('span', 'sep'));
  const tool = (ic, label, pressed, fn) => {
    const b = el('button', 'tool'); b.type = 'button'; b.setAttribute('aria-label', label); b.append(icon(ic));
    if (pressed != null) b.setAttribute('aria-pressed', String(pressed));
    b.onclick = fn; box.append(b);
  };
  tool('fa-solid fa-eraser', 'Borracha', pen.erase, () => { pen.erase = !pen.erase; drawTools(); });
  tool('fa-solid fa-rotate-left', 'Desfazer', null, () => { strokes.pop(); paint(); });
  tool('fa-solid fa-trash-can', 'Limpar', null, () => { strokes = []; paint(); });
}
function openDraw() {
  if (imgs.length >= MAX_IMGS) return alert(`Máximo de ${MAX_IMGS} imagens por nota`);
  draw.hidden = false;
  const st = $('stage'); dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(st.clientWidth * dpr); cv.height = Math.round(st.clientHeight * dpr);
  strokes = []; cur = null; pen.erase = false; paint(); drawTools();
}
const closeDraw = () => { draw.hidden = true; };
const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); cv.setPointerCapture(e.pointerId);
  const [x, y] = pt(e);
  cur = { c: pen.erase ? '#fff' : pen.color, w: pen.erase ? pen.size * 3 : pen.size, p: [[x, y]] };
  strokes.push(cur);
  ctx.strokeStyle = cur.c; ctx.lineWidth = cur.w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y); ctx.stroke();
});
cv.addEventListener('pointermove', (e) => {
  if (!cur) return;
  const [x, y] = pt(e), l = cur.p[cur.p.length - 1];
  cur.p.push([x, y]);
  ctx.strokeStyle = cur.c; ctx.lineWidth = cur.w; ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(x, y); ctx.stroke();
});
['pointerup', 'pointercancel'].forEach((ev) => cv.addEventListener(ev, () => { cur = null; }));
$('sketch').onclick = openDraw;
$('draw-close').onclick = closeDraw;
$('draw-save').onclick = () => {
  if (!strokes.length) return closeDraw();
  if (addImage(cv.toDataURL('image/jpeg', 0.8))) closeDraw();
};
$('viewer-close').onclick = closeViewer;

/* ---------- editor de caderno ---------- */
const nbSheet = $('nb-sheet');
function openNbSheet(b) {
  editingNb = b || null;
  nbColor = b ? b.color : COLORS[0];
  $('nb-title').textContent = b ? 'Editar caderno' : 'Novo caderno';
  $('nb-name').value = b ? b.name : '';
  $('nb-del').hidden = !b;
  drawSwatches($('nb-colors'), nbColor, (c) => { nbColor = c; });
  nbSheet.hidden = false; $('nb-name').focus();
}
const closeNbSheet = () => { nbSheet.hidden = true; };
$('nb-form').onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    await store.saveNotebook({ name: $('nb-name').value, color: nbColor }, editingNb && editingNb.id);
    closeNbSheet(); await refresh();
  });
};
$('nb-close').onclick = closeNbSheet;
nbSheet.onclick = (e) => { if (e.target === nbSheet) closeNbSheet(); };
$('nb-del').onclick = () => { if (editingNb) openMenu('notebook', editingNb, 'confirm'); };

/* ---------- pop-up de ações ---------- */
const menu = $('menu');
let target = null, mode = 'menu', openedAt = 0;
function setMode(m) {
  mode = m;
  const c = m === 'confirm', { kind, item } = target;
  $('pop-title').textContent = c ? (kind === 'note' ? 'Excluir esta nota?' : 'Excluir este caderno?') : (item.title || item.name);
  $('pop-text').textContent = kind === 'notebook' && item.count > 0
    ? `${plural(item.count, 'nota', 'notas')} deste caderno também ${item.count === 1 ? 'será excluída' : 'serão excluídas'}.`
    : 'Esta ação não pode ser desfeita.';
  $('pop-text').hidden = !c;
  $('pop-edit').hidden = c;
  $('pop-del-label').textContent = c ? 'Sim, excluir' : 'Excluir';
}
function openMenu(kind, item, m = 'menu') {
  target = { kind, item }; setMode(m); openedAt = Date.now();
  menu.hidden = false; (m === 'menu' ? $('pop-edit') : $('pop-cancel')).focus();
}
const closeMenu = () => { menu.hidden = true; target = null; };
$('pop-edit').onclick = () => { const t = target; closeMenu(); t.kind === 'note' ? openSheet(t.item) : openNbSheet(t.item); };
$('pop-del').onclick = () => {
  if (mode === 'menu') return setMode('confirm');
  const t = target;
  run(async () => {
    await (t.kind === 'note' ? store.deleteNote(t.item.id) : store.deleteNotebook(t.item.id));
    closeMenu(); closeSheet(); closeNbSheet(); await refresh();
  });
};
$('pop-cancel').onclick = closeMenu;
menu.onclick = (e) => { if (e.target === menu && Date.now() - openedAt > 350) closeMenu(); };
document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return;
  if (!draw.hidden) closeDraw(); else if (!viewer.hidden) closeViewer(); else { closeMenu(); closeSheet(); closeNbSheet(); } });

/* ---------- demais controles ---------- */
$('add').onclick = () => (S.view === 'notes' ? openSheet() : openNbSheet());
let timer;
$('q').oninput = () => { clearTimeout(timer); timer = setTimeout(refresh, 250); };
$('layout').onclick = () => {
  const single = $('list').classList.toggle('single');
  $('layout').firstChild.className = single ? 'fa-solid fa-grip' : 'fa-solid fa-table-list';
};
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('theme').firstChild.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  try { localStorage.setItem('theme', t); } catch (e) {}
}
$('theme').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
applyTheme(document.documentElement.dataset.theme || 'light');

refresh();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
