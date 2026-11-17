import { createBackend, parseConfig, saveConfig, savedConfig, clearConfig, startOfToday, COLLECTIONS } from './backend.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const app = document.getElementById('app');

const STATUS = {
  pending: ['รออนุมัติ', 'var(--card)', '2px solid var(--ink)'],
  open: ['รอเริ่มงาน', 'var(--ink)', '0'],
  doing: ['กำลังซ่อม', 'var(--stop)', '0'],
  parts: ['รออะไหล่', 'var(--wait)', '0'],
  done: ['ปิดงานแล้ว', 'var(--run)', '0']
};
const TYPE = { breakdown: 'ซ่อมฉุกเฉิน', pm: 'บำรุงรักษาตามแผน', inspect: 'แจ้งตรวจสอบ', improve: 'ปรับปรุง' };
const CAUSES = [
  ['C-LUB', 'ขาดการหล่อลื่น/ทำความสะอาด'], ['C-WEAR', 'ชิ้นส่วนสึกหรอตามอายุ'], ['C-PM', 'ไม่ได้ทำ PM ตามรอบ'],
  ['C-SET', 'ตั้งค่าหรือปรับแต่งผิด'], ['C-ELEC', 'ระบบไฟฟ้า/เซนเซอร์'], ['C-OPR', 'การใช้งานผิดวิธี'], ['C-OTH', 'อื่นๆ (ระบุในการแก้ไข)']
];
const FILTERS = {
  active: ['งานเปิดอยู่', (w) => w.status !== 'done'],
  pending: ['รออนุมัติ', (w) => w.status === 'pending'],
  doing: ['กำลังซ่อม', (w) => w.status === 'doing' || w.status === 'open'],
  parts: ['รออะไหล่', (w) => w.status === 'parts'],
  done: ['ปิดแล้ว', (w) => w.status === 'done']
};
const PAGES = {
  quick: ['SH-00', 'แจ้งงานด่วน', 'แจ้งงานด่วน'],
  overview: ['SH-01', 'ภาพรวม', 'ภาพรวมโรงงาน'],
  board: ['SH-09', 'แดชบอร์ด', 'แดชบอร์ดสถานะ'],
  work: ['SH-02', 'งานซ่อม', 'งานซ่อม'],
  assets: ['SH-03', 'เครื่องจักร', 'ทะเบียนเครื่องจักร'],
  pm: ['SH-04', 'แผน PM', 'แผนบำรุงรักษา'],
  parts: ['SH-05', 'อะไหล่', 'คลังอะไหล่'],
  gauges: ['SH-06', 'เครื่องมือวัด', 'ทะเบียนเครื่องมือวัด'],
  report: ['SH-07', 'รายงาน KPI', 'รายงาน KPI'],
  server: ['SH-08', 'ตั้งค่า', 'ตั้งค่าและเชื่อมต่อ']
};
const ADD_LABEL = { assets: 'เพิ่มเครื่อง', pm: 'เพิ่มแผน PM', parts: 'เพิ่มอะไหล่', gauges: 'เพิ่มเครื่องมือวัด' };
const REV = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const state = {
  backend: null, user: undefined, loadError: '', lastSync: null,
  assets: [], workOrders: [], pmPlans: [], parts: [], gauges: [],
  page: 'overview', tv: false, filter: 'active', scope: 'all', quick: false, showDone: false, collapsed: {}, selectedWo: null, selectedAsset: null, period: 30, q: '', panel: false, create: null, qr: null, users: [], setup: null, needSetup: false, issued: null, notice: '', importPreview: null,
  form: null, draft: {}, close: { cause: '', action: '' }, toast: '', canSeed: false, unsubs: []
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (opts) => (t) => new Intl.DateTimeFormat('th-TH', { hour12: false, ...opts }).format(t);
const fmtDate = fmt({ day: '2-digit', month: 'short' });
const fmtTime = fmt({ hour: '2-digit', minute: '2-digit' });
const fmtDateY = fmt({ day: '2-digit', month: 'short', year: '2-digit' });
const fmtDateTime = fmt({ day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtSec = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit' });
const today = () => fmt({ weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })(Date.now());
const hm = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const hours = (ms) => (ms / HOUR).toFixed(1);
const canTech = () => ['admin', 'tech'].includes(state.user?.role);
const canAdmin = () => state.user?.role === 'admin';
const assetOf = (id) => state.assets.find((a) => a.id === id);
const partOf = (id) => state.parts.find((p) => p.id === id);
const isoDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const PRIO = { stop: ['สูง', 'var(--stop-bg)', 'var(--stop-fg)'], slow: ['กลาง', 'var(--wait-bg)', 'var(--wait-fg)'], plan: ['ต่ำ', 'var(--grey-bg)', 'var(--grey-fg)'] };
const TYPE_STYLE = { breakdown: ['var(--stop)', 'var(--stop-bg)', 'var(--stop-fg)'], pm: ['var(--pm)', 'var(--pm-bg)', 'var(--pm-fg)'], inspect: ['var(--wait)', 'var(--grey-bg)', 'var(--grey-fg)'], improve: ['var(--ok)', 'var(--ok-bg)', 'var(--ok-fg)'] };
const priOf = (w) => w.priority || { breakdown: 'stop', inspect: 'slow', pm: 'plan' }[w.type] || 'plan';
const pill = (label, b, f) => `<span class="pill" style="--b:${b};--f:${f}">${esc(label)}</span>`;
// ตัวย่อชื่อ ข้ามสระหน้าเพื่อให้ได้พยัญชนะต้น
const ini = (name) => { if (!name) return '—'; const first = (w) => [...(w || '')].find((ch) => !'เแโใไ'.includes(ch)) || ''; const [a, b] = name.split(/\s+/); return first(a) + first(b); };
const avatar = (name, sm = true) => `<span class="avatar ${sm ? 'sm' : ''}" aria-hidden="true">${esc(ini(name))}</span>`;
const relDate = (t) => { const d0 = startOfToday(); if (t >= d0) return 'วันนี้'; if (t >= d0 - DAY) return 'เมื่อวาน'; return fmtDate(t); };
const NAV_ICON = {
  quick: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  overview: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  board: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4M7 13V9M11 13V7M15 13v-3"/>',
  work: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  assets: '<path d="M3 21V10l6 4V10l6 4V4h6v17z"/>',
  pm: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  parts: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  gauges: '<path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 15 4-5"/><path d="M4 19h16"/>',
  report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  server: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const editBtn = (coll, id) => canAdmin() ? `<button type="button" class="btn small" data-act="edit" data-coll="${coll}" data-id="${esc(id)}">แก้ไข</button>` : '';
const delBtn = (coll, id, label = 'ลบ') => canAdmin() ? `<button type="button" class="btn small danger" data-act="del" data-coll="${coll}" data-id="${esc(id)}">${label}</button>` : '';

// ไฟล์ CSV ใส่ BOM ให้ Excel อ่านภาษาไทยถูก
function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([type === 'text/csv' ? '\uFEFF' + text : text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csv = (rows) => rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');

// สถานะเครื่องมือวัด: ห้ามใช้ > เลยกำหนด > ใกล้ครบ 30 วัน > ใช้งานได้
function gaugeState(g) {
  const t0 = startOfToday();
  if (g.status === 'hold') return ['hold', 'ห้ามใช้', 'var(--stop)', '0'];
  if (g.dueDate < t0) return ['late', 'เลยกำหนด', 'var(--card)', '2px solid var(--stop)'];
  if (g.dueDate <= t0 + 30 * DAY) return ['soon', 'ใกล้ครบ', 'var(--wait)', '0'];
  return ['ok', 'ใช้งานได้', 'var(--run)', '0'];
}
const tag = (t) => `<span class="tag">${esc(t)}</span>`;
const lamp = (status, label) => `<span class="lamp" style="--c:${STATUS[status][1]};--b:${STATUS[status][2]}">${esc(label ?? STATUS[status][0])}</span>`;
const icon = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
const logo = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="14" cy="14" r="9"/><path d="M14 1v26M1 14h26" stroke-dasharray="3 2"/></svg>';

/* ---------- ตัวเลข ---------- */
function mergedDown(assetId, from, to) {
  const spans = state.workOrders
    .filter((w) => w.asset === assetId && !['inspect', 'improve'].includes(w.type))
    .map((w) => [Math.max(w.startAt, from), Math.min(w.endAt ?? to, to)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0, end = from;
  spans.forEach(([a, b]) => {
    const s = Math.max(a, end);
    if (b > s) { total += b - s; end = b; }
  });
  return total;
}

// PM compliance = PM ที่ทำทันกำหนดในช่วงเวลา ÷ (PM ที่ทำในช่วงเวลา + PM ที่ค้างเลยกำหนดอยู่)
function pmCompliance(from) {
  const doneIn = state.workOrders.filter((w) => w.type === 'pm' && w.endAt && w.endAt >= from);
  const late = state.pmPlans.filter((p) => p.dueDate < startOfToday()).length;
  const total = doneIn.length + late;
  return { pct: total ? (100 * doneIn.filter((w) => w.onTime !== false).length) / total : 100, done: doneIn.length, late, onTime: doneIn.filter((w) => w.onTime !== false).length };
}

// ตัวเลขรายเครื่องในช่วงเวลาที่เลือก
function periodStats(from, to) {
  const span = to - from;
  const rows = state.assets.map((a) => {
    const fails = state.workOrders.filter((w) => w.asset === a.id && w.type === 'breakdown' && (w.endAt ?? to) >= from && w.startAt <= to);
    const closed = fails.filter((w) => w.endAt);
    const down = mergedDown(a.id, from, to);
    return {
      a, fails: fails.length, down,
      mtbf: fails.length ? (span - down) / fails.length : null,
      mttr: closed.length ? closed.reduce((s, w) => s + w.endAt - w.startAt, 0) / closed.length : null,
      avail: 100 * (1 - down / span)
    };
  });
  const causes = {};
  state.workOrders.filter((w) => w.type === 'breakdown' && w.endAt && w.endAt >= from && w.cause).forEach((w) => { causes[w.cause] = (causes[w.cause] || 0) + 1; });
  return { rows, causes: Object.entries(causes).sort((x, y) => y[1] - x[1]) };
}

function metrics() {
  const now = Date.now();
  const from = startOfToday() - 6 * DAY;
  const open = state.workOrders.filter((w) => w.status !== 'done');
  const stopped = [...new Set(open.filter((w) => w.type === 'breakdown').map((w) => w.asset))];
  const down = state.assets.reduce((s, a) => s + mergedDown(a.id, from, now), 0);
  const cap = state.assets.length * (now - from);
  const fails = state.workOrders.filter((w) => w.type === 'breakdown' && (w.endAt ?? now) >= from && w.startAt <= now);
  const closed = fails.filter((w) => w.endAt);
  const mttr = closed.length ? closed.reduce((s, w) => s + w.endAt - w.startAt, 0) / closed.length : 0;
  const t0 = startOfToday();
  const pmSoon = state.pmPlans.filter((p) => p.dueDate <= t0 + 7 * DAY);
  const pmLate = state.pmPlans.filter((p) => p.dueDate < t0);
  const low = state.parts.filter((p) => p.qty <= p.min);
  const gaugeAlert = state.gauges.filter((g) => gaugeState(g)[0] !== 'ok');
  return {
    now, from, open, stopped, down, low, pmSoon, pmLate, gaugeAlert, fails: fails.length, closed: closed.length,
    avail: cap ? 100 * (1 - down / cap) : 100,
    mtbf: fails.length ? (cap - down) / fails.length : 0, mttr
  };
}

/* ---------- ส่วนประกอบ ---------- */

/* ---------- SH-09 แดชบอร์ดสถานะ: ดูสถานะทุกส่วนในจอเดียว ใช้บนจอทีวีในห้องซ่อมบำรุงได้ ---------- */
// ลายเซ็น: ไฟ andon 3 ชั้นแบบบนตัวเครื่อง ไฟที่ติดบอกสถานะเครื่อง (แดง หยุด / เหลือง รอ / เขียว เดิน)
const andon = (k) => `<span class="andon" data-s="${k}" aria-hidden="true"><i></i><i></i><i></i></span>`;
const MSTATE = {
  stop: ['หยุดเสีย', 'stop'], wait: ['รออะไหล่', 'wait'], pm: ['กำลังทำ PM', 'pm'], late: ['PM เลยกำหนด', 'late'], run: ['เดินเครื่อง', 'run']
};
function machineState(a) {
  const open = state.workOrders.filter((w) => w.asset === a.id && w.status !== 'done');
  const brk = open.filter((w) => w.type === 'breakdown').sort((x, y) => x.startAt - y.startAt);
  const stop = brk.find((w) => w.status !== 'parts');
  if (stop) return { k: 'stop', w: stop, since: stop.startAt };
  const wait = brk.find((w) => w.status === 'parts') || open.find((w) => w.status === 'parts');
  if (wait) return { k: 'wait', w: wait, since: wait.startAt };
  const pm = open.find((w) => w.type === 'pm' && w.status === 'doing');
  if (pm) return { k: 'pm', w: pm, since: pm.startAt };
  const late = state.pmPlans.find((p) => p.asset === a.id && p.dueDate < startOfToday());
  if (late) return { k: 'late', plan: late, since: late.dueDate };
  return { k: 'run' };
}
// แถบสัดส่วน: ช่องละสถานะ กว้างตามจำนวน
const meter = (parts, label) => {
  const total = parts.reduce((s, x) => s + x.n, 0) || 1;
  return `<div class="meter" role="img" aria-label="${esc(label)}">${parts.filter((x) => x.n).map((x) => `<span class="m-${x.k}" style="flex:${x.n}"></span>`).join('')}</div>
    <ul class="mkey">${parts.map((x) => `<li><i class="m-${x.k}" aria-hidden="true"></i>${esc(x.label)}<b class="mono">${x.n}</b></li>`).join('')}</ul>`;
};
const ago = (t) => { const ms = Date.now() - t; return ms < DAY ? `${hm(ms)} ชม.` : `${Math.floor(ms / DAY)} วัน`; };

function viewBoard(m) {
  const t0 = startOfToday();
  const now = Date.now();
  // เครื่องจักร
  const ms = state.assets.map((a) => ({ a, ...machineState(a) }));
  const countM = (k) => ms.filter((x) => x.k === k).length;
  const lines = [...new Set(state.assets.map((a) => a.line || 'ไม่ระบุไลน์'))];
  const tile = (x) => {
    const [label] = MSTATE[x.k];
    const act = x.w ? `data-act="open-wo" data-id="${esc(x.w.id)}"` : `data-act="open-asset" data-id="${esc(x.a.id)}"`;
    const cut = (t) => { const c = [...String(t || '')]; return esc(c.length > 56 ? `${c.slice(0, 54).join('').trim()}…` : c.join('')); };
    const detail = x.w ? cut(x.w.title) : x.plan ? cut(x.plan.task) : '';
    const who = x.w ? (x.w.tech ? esc(x.w.tech) : 'ยังไม่มีช่างรับงาน') : '';
    return `<button type="button" class="mtile s-${x.k}" ${act} aria-label="${esc(`${x.a.id} ${x.a.name} ${label}`)}">
      <span class="mt-top"><span class="u-row">${andon(x.k)}<span class="tag">${esc(x.a.id)}</span></span><span class="mt-state">${label}${x.since && x.k !== 'run' ? ` <span class="mono">${x.k === 'late' ? relDate(x.since) : ago(x.since)}</span>` : ''}</span></span>
      <span class="mt-name">${esc(x.a.name)}</span>
      ${detail ? `<span class="mt-detail">${detail}</span>` : ''}${who ? `<span class="mt-who">${who}</span>` : ''}
    </button>`;
  };
  // ใบงานตามขั้นตอน
  const open = state.workOrders.filter((w) => w.status !== 'done');
  const doneToday = state.workOrders.filter((w) => w.status === 'done' && w.endAt >= t0);
  const stage = (k, label, list, note) => {
    const old = [...list].sort((x, y) => x.startAt - y.startAt);
    return `<div class="stage">
      <h3>${label}</h3><p class="fig ${k === 'doing' && list.length ? '' : ''}">${list.length}</p>
      <p class="cap">${note(old)}</p>
      <ul>${old.slice(0, 3).map((w) => `<li><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.id)}</button><span>${esc(w.asset)}</span></li>`).join('')}</ul>
    </div>`;
  };
  const oldest = (l) => (l.length ? `เก่าสุด ${ago(l[0].startAt)}` : 'ไม่มีค้าง');
  const overdue = open.filter((w) => w.dueDate && w.dueDate < t0);
  const unassigned = open.filter((w) => w.status === 'open' && !w.tech);
  // PM
  const pmLate = state.pmPlans.filter((p) => p.dueDate < t0).sort((a, b) => a.dueDate - b.dueDate);
  const pmToday = state.pmPlans.filter((p) => p.dueDate >= t0 && p.dueDate < t0 + DAY);
  const pmWeek = state.pmPlans.filter((p) => p.dueDate >= t0 + DAY && p.dueDate <= t0 + 7 * DAY);
  const pmLater = state.pmPlans.length - pmLate.length - pmToday.length - pmWeek.length;
  const comp = pmCompliance(t0 - 29 * DAY);
  // อะไหล่
  const out = state.parts.filter((p) => p.qty <= 0);
  const low = state.parts.filter((p) => p.qty > 0 && p.qty <= p.min);
  const okParts = state.parts.length - out.length - low.length;
  const reorder = [...out, ...low];
  // เครื่องมือวัด
  const gs = state.gauges.map((g) => ({ g, s: gaugeState(g) }));
  const gN = (k) => gs.filter((x) => x.s[0] === k).length;
  const gAlert = gs.filter((x) => x.s[0] !== 'ok').sort((a, b) => a.g.dueDate - b.g.dueDate);
  // ทีมช่าง
  const techNames = [...new Set([...state.users.filter((u) => u.role === 'tech').map((u) => u.name), ...open.map((w) => w.tech).filter(Boolean).flatMap((t) => t.split(/,\s*/))])];
  const team = techNames.map((name) => {
    const holding = open.filter((w) => (w.tech || '').split(/,\s*/).includes(name) && w.status !== 'pending');
    const closed = state.workOrders.filter((w) => w.status === 'done' && w.endAt >= now - 7 * DAY && (w.tech || '').split(/,\s*/).includes(name)).length;
    return { name, holding, closed };
  }).sort((a, b) => b.holding.length - a.holding.length);

  const stopN = countM('stop');
  const headline = stopN
    ? `<span class="alarm">เครื่องหยุดเสีย ${stopN} เครื่อง</span> จาก ${state.assets.length} เครื่อง`
    : countM('wait') ? `<span class="warnt">รออะไหล่ ${countM('wait')} เครื่อง</span> ที่เหลือเดินปกติ` : 'ทุกเครื่องเดินปกติ';
  const seeAll = (page, label) => `<button type="button" class="link" data-act="nav" data-id="${page}">${label}</button>`;

  return `<section class="now" aria-live="polite">
      <h2>${headline}</h2>
    </section>
    <div class="dash">
      <div class="dash-main">
      <section class="box dash-machines">
        <div class="bar"><h2>เครื่องจักร</h2>
          <ul class="mkey inline">${Object.entries(MSTATE).map(([k, [label]]) => `<li>${andon(k)}${label}<b class="mono">${countM(k)}</b></li>`).join('')}</ul></div>
        ${lines.map((ln) => `<div class="mline"><h3>${esc(ln)}</h3><div class="mgrid">${ms.filter((x) => (x.a.line || 'ไม่ระบุไลน์') === ln).map(tile).join('')}</div></div>`).join('') || '<p class="empty">ยังไม่มีเครื่องจักร</p>'}
      </section>

      <section class="box dash-flow">
        <div class="bar"><h2>ใบงานตามขั้นตอน</h2>${seeAll('work', 'เปิดหน้างานซ่อม')}</div>
        <div class="stages">
          ${stage('pending', 'รออนุมัติ', open.filter((w) => w.status === 'pending'), oldest)}
          ${stage('open', 'รอเริ่มงาน', open.filter((w) => w.status === 'open'), (l) => (unassigned.length ? `ยังไม่มอบหมาย ${unassigned.length} ใบ` : oldest(l)))}
          ${stage('doing', 'กำลังซ่อม', open.filter((w) => w.status === 'doing'), oldest)}
          ${stage('parts', 'รออะไหล่', open.filter((w) => w.status === 'parts'), oldest)}
          ${stage('done', 'ปิดวันนี้', doneToday, (l) => (l.length ? `ล่าสุด ${fmtTime(Math.max(...l.map((w) => w.endAt)))}` : 'ยังไม่มีงานปิด'))}
        </div>
        ${overdue.length ? `<p class="notice err u-mbox">ใบงานเลยวันกำหนดเสร็จ ${overdue.length} ใบ: ${overdue.slice(0, 4).map((w) => esc(w.id)).join(', ')}</p>` : ''}
      </section>
      </div>

      <div class="dash-side">
        <section class="box">
          <div class="bar"><h2>แผน PM</h2>${seeAll('pm', 'ดูแผน PM')}</div>
          <dl class="trio"><div><dt>เลยกำหนด</dt><dd class="${pmLate.length ? 'alarm' : ''}">${pmLate.length}</dd></div><div><dt>ครบวันนี้</dt><dd>${pmToday.length}</dd></div><div><dt>ใน 7 วัน</dt><dd>${pmWeek.length}</dd></div></dl>
          <div class="pad goal"><p class="kpi">ทำทันกำหนดใน 30 วัน <b class="mono">${comp.pct.toFixed(0)}%</b></p><div class="prog" role="img" aria-label="ทำ PM ทันกำหนด ${comp.pct.toFixed(0)} เปอร์เซ็นต์"><span style="width:${Math.min(100, comp.pct)}%"></span></div></div>
          <ul class="alist">${[...pmLate, ...pmToday, ...pmWeek].slice(0, 5).map((p) => `<li><span class="tag">${esc(p.asset)}</span><span class="t">${esc(p.task)}</span><span class="u-nowrap ${p.dueDate < t0 ? 'alarm' : 'dim'}">${p.dueDate < t0 ? `เลย ${Math.ceil((t0 - p.dueDate) / DAY)} วัน` : relDate(p.dueDate) === 'วันนี้' ? 'วันนี้' : fmtDate(p.dueDate)}</span></li>`).join('') || '<li class="dim">ไม่มี PM ใน 7 วันนี้</li>'}</ul>
        </section>
        <section class="box">
          <div class="bar"><h2>อะไหล่ที่ต้องสั่ง <span class="dim u-w400">${reorder.length} จาก ${state.parts.length}</span></h2>${seeAll('parts', 'ดูคลังอะไหล่')}</div>
          ${reorder.length ? `<ul class="alist">${[...reorder].sort((a, b) => a.qty / Math.max(1, a.min) - b.qty / Math.max(1, b.min)).slice(0, 6).map((p) => `<li><span class="tag">${esc(p.id)}</span><span class="t">${esc(p.name)}</span><span class="stock"><span class="sbar"><span style="width:${Math.min(100, (100 * p.qty) / Math.max(1, p.min))}%"></span></span><span class="mono ${p.qty <= 0 ? 'alarm' : ''}">${p.qty <= 0 ? 'หมด' : `${p.qty}/${p.min}`}</span></span></li>`).join('')}</ul>` : '<p class="empty">อะไหล่ทุกรายการอยู่เหนือจุดสั่งซื้อ</p>'}
        </section>
        <section class="box">
          <div class="bar"><h2>เครื่องมือวัด <span class="dim u-w400">ใช้งานได้ ${gN('ok')} จาก ${state.gauges.length}</span></h2>${seeAll('gauges', 'ดูทะเบียน')}</div>
          ${gAlert.length ? `<ul class="alist">${gAlert.slice(0, 4).map((x) => `<li><span class="tag">${esc(x.g.id)}</span><span class="t">${esc(x.g.name)}</span><span class="u-nowrap ${x.s[0] === 'soon' ? 'dim' : 'alarm'}">${x.s[1]}</span></li>`).join('')}</ul>` : '<p class="empty">ทุกเครื่องมืออยู่ในรอบสอบเทียบ</p>'}
        </section>
        <section class="box">
          <div class="bar"><h2>ทีมช่าง</h2><span class="dim u-small">งานที่ถืออยู่ / ปิดใน 7 วัน</span></div>
          ${team.length ? `<ul class="team">${team.map((t) => `<li>${avatar(t.name)}<span class="t"><b>${esc(t.name)}</b><span>${t.holding.length ? t.holding.slice(0, 3).map((w) => esc(w.id)).join(', ') : 'ว่าง'}</span></span><span class="mono">${t.holding.length}<span class="dim"> / ${t.closed}</span></span></li>`).join('')}</ul>` : '<p class="empty">ยังไม่มีช่างในระบบ เพิ่มได้ในหน้าตั้งค่า</p>'}
          ${unassigned.length ? `<p class="hint u-pad-b">อนุมัติแล้วแต่ยังไม่มีช่างรับ ${unassigned.length} ใบ</p>` : ''}
        </section>
      </div>
    </div>`;
}

/* ---------- SH-01 ภาพรวม ---------- */
function viewOverview(m) {
  const span = 7 * DAY;
  const pct = (t) => (((t - m.from) / span) * 100).toFixed(2);
  const days = Array.from({ length: 7 }, (_, i) => `<span>${fmtDate(m.from + i * DAY)}</span>`).join('');
  const rows = state.assets.map((a) => {
    const spans = state.workOrders
      .filter((w) => w.asset === a.id && !['inspect', 'improve'].includes(w.type) && (w.endAt ?? m.now) >= m.from)
      .map((w) => {
        const a0 = Math.max(w.startAt, m.from), a1 = w.endAt ?? m.now;
        const style = w.type === 'pm' ? '--c:var(--card);--b:2px solid var(--pm)' : `--c:${w.status === 'parts' ? 'var(--wait)' : 'var(--stop)'}`;
        const label = esc(`${w.id} ${w.title} ${hours(a1 - w.startAt)} ชม.`);
        // แท่งเหตุการณ์เป็นทางลัดสำหรับเมาส์ ใบงานเดียวกันเปิดจากตารางใบงานและหน้าประวัติเครื่องได้ด้วยคีย์บอร์ด
        return `<span class="seg" data-act="open-wo" data-id="${esc(w.id)}" aria-hidden="true" title="${label}" style="left:${pct(a0)}%;width:${(((a1 - a0) / span) * 100).toFixed(2)}%;${style}"></span>`;
      }).join('');
    const d = mergedDown(a.id, m.from, m.now);
    return `<div class="tl-row">
      <button type="button" class="tl-name" data-act="open-asset" data-id="${esc(a.id)}">${andon(machineState(a).k)}${tag(a.id)}<span class="nm">${esc(a.name)}</span></button>
      <div class="track"><div class="base" style="width:${pct(m.now)}%"></div>${spans}<div class="now" style="left:${pct(m.now)}%"></div></div>
      <span class="tl-sum ${d ? '' : 'dim'}">${d ? hours(d) : '0'}</span></div>`;
  }).join('');
  const openRows = m.open.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}">
      <td><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.id)}</button></td>
      <td>${tag(w.asset)}</td>
      <td>${esc(w.title)}<span class="sub"><span>${esc(w.tech || 'ยังไม่มอบหมาย')}</span><span>${TYPE[w.type]}</span></span></td>
      <td class="mono">${hm(m.now - w.startAt)}</td><td>${lamp(w.status)}</td></tr>`).join('');
  const t0 = startOfToday();
  const pmRows = [...m.pmSoon].sort((a, b) => a.dueDate - b.dueDate).map((p) => `<div class="list-row">
      <span class="mono ${p.dueDate < t0 ? 'alarm' : ''}">${fmtDate(p.dueDate)}</span>
      <span class="t"><span>${esc(p.task)}</span><span class="s"><span>${esc(p.asset)}</span><span>ทุก ${p.intervalDays} วัน</span></span></span><span></span></div>`).join('') || '<p class="empty">ไม่มี PM ครบกำหนดใน 7 วัน</p>';
  const lowRows = m.low.map((p) => `<div class="list-row u-cols-auto">
      <span class="t"><span>${esc(p.name)}</span><span class="s">${esc(p.id)}</span></span>
      <span class="mono ${p.qty === 0 ? 'alarm' : ''}">${p.qty} / ${p.min}</span></div>`).join('') || '<p class="empty">สต็อกอยู่เหนือจุดสั่งซื้อทุกรายการ</p>';
  return `<section class="box board">
      <div class="bar"><h2>สถานะเครื่อง 7 วัน</h2>
        <div class="legend"><span><i class="bar" style="--c:var(--run)"></i>เดินเครื่อง</span><span><i style="--c:var(--stop)"></i>หยุดเสีย</span><span><i style="--c:var(--wait)"></i>รออะไหล่</span><span><i style="--c:var(--card);--b:2px solid var(--pm)"></i>PM ตามแผน</span></div></div>
      <dl class="ledger" aria-label="ตัวเลขสำคัญ">
        <div><dt>เครื่องหยุดตอนนี้</dt><dd class="fig ${m.stopped.length ? 'alarm' : ''}">${m.stopped.length}<small> / ${state.assets.length}</small></dd><dd class="cap">${esc(m.stopped.join(', ') || 'ทุกเครื่องเดินปกติ')}</dd></div>
        <div><dt>Availability 7 วัน</dt><dd class="fig">${m.avail.toFixed(1)}<small>%</small></dd><dd class="cap">รวมเวลาหยุด ${hours(m.down)} ชม.</dd></div>
        <div><dt>MTBF</dt><dd class="fig">${hours(m.mtbf)}<small> ชม.</small></dd><dd class="cap">เครื่องเสีย ${m.fails} ครั้งใน 7 วัน</dd></div>
        <div><dt>MTTR</dt><dd class="fig">${hours(m.mttr)}<small> ชม.</small></dd><dd class="cap">จากงานซ่อมที่ปิดแล้ว ${m.closed} ใบ</dd></div>
      </dl>
      <div class="scroll"><div class="tl">
        <div class="tl-row top"><span>เครื่อง</span><div class="tl-days">${days}</div><span class="num">หยุด (ชม.)</span></div>
        ${rows || '<p class="empty">ยังไม่มีเครื่องจักร</p>'}
        <div class="tl-row foot"><span></span><span class="dim num tl-note">เส้นตั้งคือเวลาปัจจุบัน ${fmtTime(m.now)}</span><span class="tl-sum tl-total">${hours(m.down)}</span></div>
      </div></div>
    </section>
    <div class="split">
      <section class="box w3 u-gap0"><div class="bar"><h2>ใบสั่งงานที่เปิดอยู่</h2><button type="button" class="link u-sans" data-act="nav" data-id="work">ดูทั้งหมด</button></div>
        ${openRows ? `<div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">เลขที่</th><th scope="col">เครื่อง</th><th scope="col">อาการ</th><th scope="col">เปิดมา</th><th scope="col">สถานะ</th></tr></thead><tbody>${openRows}</tbody></table></div>` : '<p class="empty">ไม่มีงานค้าง</p>'}</section>
      <div class="w2">
        <section class="box"><div class="bar"><h2>PM ครบกำหนด 7 วัน</h2>${m.pmLate.length ? `<span class="alarm" style="font-size:var(--text-sm)">เลยกำหนด ${m.pmLate.length}</span>` : ''}</div>${pmRows}</section>
        <section class="box"><div class="bar"><h2>อะไหล่ถึงจุดสั่งซื้อ</h2></div>${lowRows}</section>
        <section class="box"><div class="bar"><h2>เครื่องมือวัดที่ต้องดู</h2><button type="button" class="link u-sans" data-act="nav" data-id="gauges">ทะเบียน</button></div>
          ${m.gaugeAlert.map((g) => { const [, label, c, b] = gaugeState(g); return `<div class="list-row u-cols-auto"><span class="t"><span>${esc(g.name)}</span><span class="s"><span>${esc(g.id)}</span><span>ครบ ${fmtDate(g.dueDate)}</span></span></span><span class="lamp" style="--c:${c};--b:${b}">${label}</span></div>`; }).join('') || '<p class="empty">ทุกเครื่องมืออยู่ในรอบสอบเทียบ</p>'}</section>
      </div>
    </div>`;
}

/* ---------- SH-02 ใบสั่งงาน ---------- */
function formWorkOrder() {
  const d = state.draft;
  const opts = state.assets.map((a) => `<option value="${esc(a.id)}" ${d.asset === a.id ? 'selected' : ''}>${esc(a.id)} ${esc(a.name)}</option>`).join('');
  const pri = [['stop', 'เครื่องหยุด'], ['slow', 'เดินได้แต่ผิดปกติ'], ['plan', 'ซ่อมตามแผนได้']];
  return `<form class="box" data-form="wo"><div class="bar"><h2>แจ้งซ่อมใหม่</h2></div>
    <div class="pad"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:var(--space-sm) var(--space-md)">
      <div class="field"><label for="f-asset">เครื่องจักร</label><select id="f-asset" name="asset" required>${opts}</select></div>
      <div class="field"><label for="f-pri">ผลกระทบ</label><select id="f-pri" name="priority">${pri.map(([v, l]) => `<option value="${v}" ${d.priority === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field full"><label for="f-title">อาการที่พบ</label><textarea id="f-title" name="title" rows="2" required>${esc(d.title)}</textarea></div>
    </div>
    <div class="actions"><button class="btn solid">ส่งแจ้งซ่อม</button><button type="button" class="btn" data-act="close-form">ยกเลิก</button></div></div></form>`;
}

function woDetail(w) {
  const now = Date.now();
  const done = w.status === 'done';
  const st = (n, label, who, time, cls) => `<div class="step ${cls}"><span class="ball">${n}</span><span class="t"><b>${label}</b><span class="s">${esc(who)}</span><span class="m">${time}</span></span></div>`;
  const approved = !!w.approvedAt;
  const repairLabel = w.status === 'parts' ? 'รออะไหล่' : 'ซ่อม';
  const steps = [
    st(1, 'แจ้งซ่อม', w.requestedBy || '—', fmtDateTime(w.startAt), 'done'),
    st(2, 'อนุมัติ', w.approvedBy || 'รอหัวหน้าอนุมัติ', approved ? fmtDateTime(w.approvedAt) : '—', approved ? 'done' : 'current'),
    st(3, repairLabel, w.tech || 'ยังไม่มอบหมาย', approved ? TYPE[w.type] : '—', done ? 'done' : (approved ? 'current' : '')),
    st(4, 'ปิดงาน', done ? (w.tech || '—') : 'รอผลการซ่อม', done ? fmtDateTime(w.endAt) : '—', done ? 'done' : '')
  ].join('');
  const a = assetOf(w.asset);
  const log = [...(w.log || [])].map((l, i) => ({ ...l, rev: REV[i] || i })).reverse();
  const used = w.partsUsed || [];
  const canIssue = !done && approved && canTech();
  const partsBox = `<section class="box"><div class="bar"><h2>อะไหล่ที่เบิก</h2></div>
    ${used.length ? `<div class="scroll"><table style="min-width:420px"><thead><tr><th scope="col">รหัส</th><th scope="col">รายการ</th><th scope="col" class="num">จำนวน</th><th scope="col" class="num">คลังคงเหลือ</th></tr></thead><tbody>
      ${used.map((u) => { const p = partOf(u.id); return `<tr><td class="mono">${esc(u.id)}</td><td>${esc(p?.name || '—')}</td><td class="mono num">${u.qty}</td><td class="mono num ${p && p.qty <= p.min ? 'alarm' : ''}">${p ? `${p.qty} / ${p.min}` : '—'}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<p class="empty">ยังไม่มีการเบิกอะไหล่</p>'}
    ${canIssue ? `<form class="pad" data-form="issue" style="flex-direction:row;flex-wrap:wrap;align-items:flex-end;border-top:1px solid var(--line)">
      <div class="field" style="flex:1 1 220px;min-width:0"><label for="i-part">อะไหล่</label><select id="i-part" name="part" required class="u-fill">${state.parts.map((p) => `<option value="${esc(p.id)}" ${p.qty ? '' : 'disabled'}>${esc(p.id)} ${esc(p.name)} (คงเหลือ ${p.qty})</option>`).join('')}</select></div>
      <div class="field" style="flex:0 1 96px"><label for="i-qty">จำนวน</label><input id="i-qty" name="qty" type="number" min="1" value="1" required></div>
      <button class="btn">เบิกเข้าใบงาน</button></form>` : ''}</section>`;
  let action = '';
  if (!done && w.status === 'pending') {
    action = canAdmin()
      ? `<div class="actions"><button type="button" class="btn solid" data-act="approve">อนุมัติและมอบหมาย</button></div><p class="hint">อนุมัติแล้วใบงานจะไปอยู่ในคิวช่าง</p>`
      : '<p class="hint">รอหัวหน้าซ่อมบำรุงอนุมัติ</p>';
  } else if (!done && canTech()) {
    const c = state.close;
    const ready = c.cause && c.action.trim();
    action = `<div class="field"><label for="w-tech">ช่างผู้รับผิดชอบ</label><input id="w-tech" data-save="tech" value="${esc(w.tech)}"></div>
      <div class="field"><label for="w-cause">รหัสสาเหตุ</label><select id="w-cause" data-close="cause"><option value="">เลือกรหัสสาเหตุ</option>${CAUSES.map(([k, l]) => `<option value="${k}" ${c.cause === k ? 'selected' : ''}>${k} · ${l}</option>`).join('')}</select></div>
      <div class="field"><label for="w-action">การแก้ไขที่ต้นเหตุ</label><textarea id="w-action" data-close="action" rows="3" placeholder="เช่น เพิ่มรายการเปลี่ยนไส้กรองใน checklist กะ A">${esc(c.action)}</textarea></div>
      <div class="actions">
        <button type="button" class="btn" data-act="wo-status" data-id="doing" ${w.status === 'doing' ? 'disabled' : ''}>${w.status === 'parts' ? 'กลับมาซ่อมต่อ' : 'เริ่มซ่อม'}</button>
        <button type="button" class="btn" data-act="wo-status" data-id="parts" ${w.status === 'parts' ? 'disabled' : ''}>รออะไหล่</button>
        <button type="button" class="btn solid" data-act="wo-close" ${ready ? '' : 'disabled'}>ปิดงาน</button>
      </div>
      <p class="hint">${ready ? 'ปิดงานแล้วระบบจะบันทึกเวลาและเพิ่มเข้าประวัติเครื่อง' : 'เลือกรหัสสาเหตุและกรอกการแก้ไขที่ต้นเหตุก่อนปิดงาน'}</p>`;
  } else if (done) {
    action = `<dl class="kv"><dt>รหัสสาเหตุ</dt><dd class="mono">${esc(w.cause || '—')}</dd><dt>การแก้ไข</dt><dd>${esc(w.action || '—')}</dd><dt>เวลาหยุดรวม</dt><dd class="mono">${hm(w.endAt - w.startAt)} ชม.</dd></dl>`;
  } else {
    action = '<p class="hint">บัญชีนี้ดูได้อย่างเดียว</p>';
  }
  return `<section class="stack" aria-label="รายละเอียดใบสั่งงาน">
    <div class="head" style="border:0;padding:0"><div><span class="doc"><span class="mono">${esc(w.id)}</span><span>${TYPE[w.type]}</span></span><h2 style="font-size:var(--text-xl);line-height:1.35">${esc(w.title)}</h2></div>
      ${lamp(w.status)}</div>
    <div class="steps">${steps}</div>
    <div class="split">
      <div class="w3">
        <section class="box"><div class="bar"><h2>ข้อมูลงาน</h2></div>
          <dl class="facts">
            <div><dt>เครื่อง</dt><dd><button type="button" class="link" data-act="open-asset" data-id="${esc(w.asset)}">${esc(w.asset)}</button> ${esc(a?.name)}</dd></div>
            <div><dt>ตำแหน่ง</dt><dd>${esc(a?.line || '—')}</dd></div>
            <div><dt>ระดับเครื่อง</dt><dd>${esc(a?.cls || '—')}</dd></div>
            <div><dt>เครื่องหยุด</dt><dd class="mono">${w.type === 'inspect' || w.type === 'improve' ? 'ไม่หยุด' : `${hm((w.endAt ?? now) - w.startAt)} ชม.`}</dd></div>
            ${w.dueDate ? `<div><dt>กำหนดเสร็จ</dt><dd class="mono ${!done && w.dueDate < startOfToday() ? 'alarm' : ''}">${fmtDateY(w.dueDate)}</dd></div>` : ''}
            ${(w.team || []).length > 1 ? `<div><dt>ทีม</dt><dd>${w.team.map(esc).join(', ')}</dd></div>` : ''}
          </dl>
          ${w.note ? `<div class="pad" style="gap:var(--space-2xs)"><span class="hint">รายละเอียด</span><p class="u-pre">${esc(w.note)}</p></div>` : ''}
          ${w.photo ? `<div class="pad" style="gap:var(--space-2xs)"><span class="hint">รูปจากผู้แจ้ง</span><img src="${esc(w.photo)}" alt="รูปอาการที่ผู้แจ้งถ่าย" style="max-width:100%;border-radius:var(--radius-card);border:1px solid var(--line)"></div>` : ''}</section>
        ${(w.checks || []).length ? `<section class="box"><div class="bar"><h2>รายการตรวจ</h2><span class="mono dim">${w.checks.filter((c) => c.done).length} / ${w.checks.length}</span></div>
          ${w.checks.map((c, i) => `<label class="list-row" style="grid-template-columns:22px minmax(0,1fr);align-items:center;cursor:${!done && canTech() && approved ? 'pointer' : 'default'}"><input type="checkbox" data-check="${i}" ${c.done ? 'checked' : ''} ${!done && canTech() && approved ? '' : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent)"><span style="${c.done ? 'color:var(--muted);text-decoration:line-through' : ''}">${esc(c.text)}</span></label>`).join('')}
          ${!done && !approved ? '<p class="hint u-pad-b">ติ๊กได้หลังหัวหน้าอนุมัติ</p>' : ''}</section>` : ''}
        <section class="box"><div class="bar"><h2>บันทึกการเปลี่ยนแปลง</h2></div>
          <table><thead><tr><th scope="col" style="width:48px">REV</th><th scope="col" style="width:140px">เวลา</th><th scope="col">รายการ</th></tr></thead>
          <tbody>${log.map((l) => `<tr><td class="mono">${l.rev}</td><td class="mono u-nowrap">${fmtDateTime(l.at)}</td><td>${esc(l.text)}</td></tr>`).join('')}</tbody></table></section>
        ${partsBox}
      </div>
      <section class="box w2" style="gap:0;border-width:1.5px"><div class="bar"><h2>${done ? 'ผลการปิดงาน' : 'บันทึกผลและปิดงาน'}</h2></div><div class="pad">${action}</div></section>
    </div></section>`;
}

function scopeList() {
  const me = state.user.name;
  return state.scope === 'mine' ? state.workOrders.filter((w) => w.tech === me || w.requestedBy === me) : state.workOrders;
}

function taskRow(w) {
  const done = w.status === 'done';
  const [c, tb, tf] = TYPE_STYLE[w.type] || TYPE_STYLE.inspect;
  const [pl, pb, pf] = PRIO[priOf(w)];
  const sub = `<span class="mono">${esc(w.id)}</span><span>${done ? 'ปิดแล้ว' : STATUS[w.status][0]}</span>`;
  return `<div class="trow task ${done ? 'done' : ''}" data-act="open-wo" data-id="${esc(w.id)}"${w.id === state.selectedWo ? ' aria-current="true"' : ''}>
    <span class="stripe" style="--c:${c}"></span>
    <span><button type="button" class="check ${done ? 'on' : ''}" data-act="open-wo" data-id="${esc(w.id)}" aria-label="เปิดใบงาน ${esc(w.id)}${done ? ' (ปิดแล้ว)' : ''}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></button></span>
    <span class="tname"><button type="button" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.title)}</button><small>${sub}</small></span>
    <span class="cell">${pill(TYPE[w.type], 'var(--grey-bg)', done ? 'var(--muted)' : 'var(--grey-fg)')}</span>
    <span class="cell"><span class="tag">${esc(w.asset)}</span></span>
    <span class="cell">${w.tech ? `${avatar(w.tech)}<span class="u-ell">${esc(w.tech)}</span>` : '<span class="dim">ยังไม่มอบหมาย</span>'}</span>
    <span class="cell mono" style="font-size:var(--text-sm)">${relDate(done ? w.endAt : w.startAt)}</span>
    <span class="cell">${done ? pill(pl, 'var(--grey-bg)', 'var(--muted)') : pill(pl, pb, pf)}</span>
  </div>`;
}

function quickAdd() {
  if (!state.user.role) return '';
  if (!state.quick) return `<button type="button" class="addrow" data-act="quick-open"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>เพิ่มงาน</button>`;
  const d = state.draft;
  return `<form class="quick" data-form="quick">
    <label for="qa-title" class="sr">ชื่องาน</label><input id="qa-title" name="title" placeholder="อาการหรือชื่องาน แล้วกด Enter" value="${esc(d.title)}" required autocomplete="off">
    <label for="qa-asset" class="sr">เครื่องจักร</label><select id="qa-asset" name="asset" required>${state.assets.map((a) => `<option value="${esc(a.id)}" ${d.asset === a.id ? 'selected' : ''}>${esc(a.id)} ${esc(a.name)}</option>`).join('')}</select>
    <label for="qa-pri" class="sr">ผลกระทบ</label><select id="qa-pri" name="priority" style="flex-basis:150px">${Object.entries({ stop: 'เครื่องหยุด', slow: 'เดินได้แต่ผิดปกติ', plan: 'ทำตามแผนได้' }).map(([k, l]) => `<option value="${k}" ${(d.priority || 'stop') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="btn solid small">เพิ่ม</button><button type="button" class="btn small" data-act="quick-cancel">ยกเลิก</button>
  </form>`;
}

function viewWork() {
  const all = state.workOrders;
  const me = state.user.name;
  const mineCount = all.filter((w) => (w.tech === me || w.requestedBy === me) && w.status !== 'done').length;
  const tabs = [['mine', 'งานของฉัน', mineCount], ['all', 'งานทั้งหมด', all.filter((w) => w.status !== 'done').length]]
    .map(([k, l, n]) => `<button type="button" data-act="scope" data-id="${k}" aria-pressed="${state.scope === k}">${l}<span>${n}</span></button>`).join('');
  const list = scopeList();
  const groups = [
    ['pending', 'รออนุมัติ', (w) => w.status === 'pending'],
    ['active', 'กำลังดำเนินการ', (w) => ['open', 'doing', 'parts'].includes(w.status)],
    ['done', 'ปิดแล้ว', (w) => w.status === 'done']
  ];
  const chevron = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const body = groups.map(([k, label, test]) => {
    const items = list.filter(test);
    const open = !state.collapsed[k];
    const shown = k === 'done' && !state.showDone ? items.slice(0, 6) : items;
    return `<section aria-label="${label}">
      <button type="button" class="ghead" data-act="toggle-group" data-id="${k}" aria-expanded="${open}">${chevron}${label}<span class="mono">${items.length}</span></button>
      ${open ? `${shown.map(taskRow).join('')}${!items.length && k !== 'pending' ? '<p class="empty" style="padding-left:var(--space-lg)">ไม่มีงานในกลุ่มนี้</p>' : ''}
        ${k === 'done' && items.length > shown.length ? `<button type="button" class="more" data-act="show-done">แสดงอีก ${items.length - shown.length} งาน</button>` : ''}
        ${k === 'pending' ? quickAdd() : ''}` : ''}
    </section>`;
  }).join('');
  return `<div class="u-spread"><div class="chips" role="group" aria-label="ขอบเขตงาน">${tabs}</div>
      <button type="button" class="btn" data-act="export-wo">ส่งออก CSV</button></div>
    <div class="tasks"><div class="scroll"><div class="grid">
      <div class="trow th"><span></span><span></span><span class="u-px">ชื่องาน</span><span class="u-px">ประเภท</span><span class="u-px">เครื่อง</span><span class="u-px">ผู้รับผิดชอบ</span><span class="u-px">วันที่</span><span class="u-px">ความสำคัญ</span></div>
      ${body}
    </div></div></div>`;
}

/* ---------- SH-00 แจ้งงานด่วน (ฝ่ายผลิต ใช้บนมือถือ) ---------- */
const SYMPTOMS = ['หยุดทำงาน', 'หยิบชิ้นงานพลาด', 'เสียงผิดปกติ', 'ของเสียเพิ่มขึ้น', 'ร้อนผิดปกติ', 'มีรอยรั่ว', 'มีข้อความ error'];
function freshQr() {
  return { asset: '', symptoms: [], stopped: null, note: '', photo: null, sent: null, filter: '' };
}
function viewQuick() {
  const q = state.qr || (state.qr = freshQr());
  if (q.sent) {
    const w = state.workOrders.find((x) => x.id === q.sent.id);
    return `<section class="qr done" aria-live="polite">
      <span class="okmark"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></span>
      <div><h2 style="font-size:var(--text-2xl);line-height:1.35">ส่งแจ้งงานแล้ว</h2><span class="mono dim">${esc(q.sent.id)}</span></div>
      <dl class="kv box" style="padding:var(--space-md);border-radius:var(--radius-card)"><dt>เครื่อง</dt><dd class="mono">${esc(q.sent.asset)}</dd><dt>อาการ</dt><dd>${esc(q.sent.title)}</dd><dt>สถานะ</dt><dd>${w ? STATUS[w.status][0] : 'รออนุมัติ'}</dd></dl>
      <p class="dim">${q.sent.stopped ? 'แจ้งหัวหน้าซ่อมบำรุงแล้ว ถ้าไม่มีช่างมารับงานใน 15 นาที ให้โทรแจ้งห้องซ่อมบำรุง' : 'ช่างจะเข้ามาตรวจภายในกะนี้ ติดตามสถานะได้ที่หน้างานซ่อม'}</p>
      <div class="actions"><button type="button" class="btn solid big" data-act="qr-again">แจ้งงานอื่น</button><button type="button" class="btn big" data-act="open-wo" data-id="${esc(q.sent.id)}">ดูใบงาน</button></div>
    </section>`;
  }
  const t = q.filter.trim().toLowerCase();
  const list = state.assets.filter((a) => !t || `${a.id} ${a.name} ${a.line}`.toLowerCase().includes(t));
  const ready = q.asset && q.symptoms.length && q.stopped !== null;
  const missing = !q.asset ? 'เลือกเครื่อง' : !q.symptoms.length ? 'เลือกอาการอย่างน้อย 1 ข้อ' : q.stopped === null ? 'บอกว่าเครื่องยังเดินอยู่ไหม' : '';
  return `<form class="qr" data-form="qr">
    <p class="hint" style="margin:calc(-1 * var(--space-xs)) 0 0">แจ้งได้ใน 3 ขั้น ใบงานจะส่งให้หัวหน้าซ่อมบำรุงอนุมัติทันที <button type="button" class="link u-sans" data-act="nav" data-id="work">ดูงานซ่อมทั้งหมด</button></p>
    <fieldset><legend>1. เครื่องไหน</legend>
      <label for="qr-filter" class="sr">ค้นหาเครื่อง</label><input id="qr-filter" class="qr-input" data-qr="filter" value="${esc(q.filter)}" placeholder="พิมพ์รหัสหรือชื่อเครื่อง" autocomplete="off">
      <div class="qr-assets" id="qr-assets">${list.map((a) => `<button type="button" class="opt ${q.asset === a.id ? 'on' : ''}" aria-pressed="${q.asset === a.id}" data-act="qr-asset" data-id="${esc(a.id)}"><span class="mono u-w500">${esc(a.id)}</span><span class="hint">${esc(a.name)}</span></button>`).join('') || '<p class="hint">ไม่พบเครื่องที่ค้นหา</p>'}</div>
    </fieldset>
    <fieldset><legend>2. อาการ</legend>
      <div class="qr-chips">${SYMPTOMS.map((x) => `<button type="button" class="chip ${q.symptoms.includes(x) ? 'on' : ''}" aria-pressed="${q.symptoms.includes(x)}" data-act="qr-sym" data-id="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <label for="qr-note" class="sr">รายละเอียดเพิ่มเติม</label><textarea id="qr-note" class="qr-input" data-qr="note" rows="2" placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)">${esc(q.note)}</textarea>
    </fieldset>
    <fieldset><legend>3. เครื่องยังเดินอยู่ไหม</legend>
      <div class="qr-two"><button type="button" class="opt big ${q.stopped === true ? 'stop' : ''}" aria-pressed="${q.stopped === true}" data-act="qr-stop" data-id="1">หยุดแล้ว</button><button type="button" class="opt big ${q.stopped === false ? 'on' : ''}" aria-pressed="${q.stopped === false}" data-act="qr-stop" data-id="0">ยังเดินอยู่</button></div>
    </fieldset>
    <div class="qr-photo">${q.photo
      ? `<img src="${esc(q.photo)}" alt="รูปที่แนบ"><button type="button" class="btn small" data-act="qr-photo-del">เอารูปออก</button>`
      : `<label class="photo-drop" for="qr-file"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>ถ่ายรูปอาการ <span class="hint">ช่วยให้ช่างเตรียมอะไหล่ถูก</span></label><input id="qr-file" type="file" accept="image/*" capture="environment" class="sr">`}</div>
    <div class="qr-foot"><span class="hint" id="qr-hint" style="${ready ? '' : 'color:var(--stop-fg)'}">${ready ? (q.stopped ? 'จะแจ้งหัวหน้าซ่อมบำรุงทันทีเพราะเครื่องหยุด' : 'เข้าคิวงานตรวจสอบของกะนี้') : missing}</span>
      <button class="btn solid big" ${ready ? '' : 'disabled'}>ส่งแจ้งงาน</button></div>
  </form>`;
}

// ย่อรูปให้กว้างไม่เกิน 800 px เป็น JPEG เพื่อให้เก็บในใบงานได้ (Firestore จำกัด 1 MB ต่อเอกสาร)
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านรูปไม่ได้ ลองถ่ายใหม่')); };
    img.src = url;
  });
}

function peopleList() {
  const fromUsers = state.users.filter((u) => ['admin', 'tech'].includes(u.role)).map((u) => u.name);
  if (fromUsers.length) return [...new Set([state.user.name, ...fromUsers])];
  const names = new Set([state.user.name]);
  state.workOrders.forEach((w) => { if (w.tech) names.add(w.tech); (w.team || []).forEach((n) => names.add(n)); });
  return [...names].filter((n) => n && n !== 'แผน PM').slice(0, 10);
}

function createPanel() {
  const c = state.create;
  if (!state.panel || !c) return '';
  const opt = (on) => `aria-pressed="${on}" class="opt ${on ? 'on' : ''}"`;
  const a = assetOf(c.asset);
  const ready = c.title.trim() && c.asset;
  const P = [['stop', 'เครื่องหยุด', 'ไลน์หยุดหรือของเสียหลุด ต้องเริ่มทันที', 'var(--stop)'], ['slow', 'เดินได้แต่ผิดปกติ', 'ทำภายในกะนี้ก่อนจะลามเป็นเครื่องหยุด', 'var(--wait)'], ['plan', 'ทำตามแผนได้', 'นัดทำช่วงหยุดเปลี่ยนรุ่นหรือวันซ่อมบำรุง', 'var(--run)']];
  return `<div class="drawer-wrap"><button type="button" class="scrim" data-act="panel-close" aria-label="ปิด" tabindex="-1"></button>
    <form class="drawer create" role="dialog" aria-modal="true" aria-labelledby="cp-h" data-form="create">
      <div class="dhead"><div><h2 id="cp-h" style="font-size:var(--text-lg);line-height:1.35">สร้างงานใหม่</h2><span class="mono dim" style="font-size:var(--text-xs)">ร่าง ส่งแล้วรอหัวหน้าอนุมัติ</span></div>
        <button type="button" class="iconbtn" data-act="panel-close" aria-label="ปิด"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="dbody cbody">
        <div class="field"><label for="cp-title">ชื่องาน</label><input id="cp-title" data-c="title" value="${esc(c.title)}" placeholder="เช่น เปลี่ยนไส้กรองหัวดูด MNT-103" style="min-height:48px;font-size:var(--text-md)" autocomplete="off"></div>
        <fieldset><legend>ประเภทงาน</legend><div class="optgrid">${Object.entries(TYPE).map(([k, l]) => `<button type="button" ${opt(c.type === k)} data-act="c-type" data-id="${k}">${l}</button>`).join('')}</div></fieldset>
        <div class="cgrid">
          <div class="field"><label for="cp-asset">เครื่องจักร</label><select id="cp-asset" data-c="asset" data-rerender="1"><option value="">เลือกเครื่อง</option>${state.assets.map((x) => `<option value="${esc(x.id)}" ${c.asset === x.id ? 'selected' : ''}>${esc(x.id)} · ${esc(x.name)}</option>`).join('')}</select>
            <span class="hint">${a ? `${esc(a.line)}, ระดับความสำคัญ ${esc(a.cls)}` : 'งานต้องผูกกับเครื่องเพื่อเก็บประวัติ'}</span></div>
          <div class="field"><label for="cp-due">กำหนดเสร็จ</label><input id="cp-due" type="date" data-c="due" value="${esc(c.due)}"><span class="hint">ไม่บังคับ</span></div>
        </div>
        <fieldset><legend>ผลกระทบ</legend><div style="display:flex;flex-direction:column;gap:var(--space-xs)">${P.map(([k, l, d, col]) => `<button type="button" ${opt(c.prio === k)} data-act="c-prio" data-id="${k}" style="display:grid;grid-template-columns:12px minmax(0,1fr);gap:var(--space-sm);text-align:left;align-items:start;padding:var(--space-sm) var(--space-sm)"><span style="width:12px;height:12px;margin-top:4px;border-radius:6px;background:${col}"></span><span style="display:flex;flex-direction:column;gap:var(--space-3xs)"><b class="u-w500">${l}</b><span class="hint">${d}</span></span></button>`).join('')}</div></fieldset>
        <fieldset><legend>มอบหมายให้ <span class="hint u-w400">เลือกได้หลายคน คนแรกเป็นผู้รับผิดชอบหลัก</span></legend><div style="display:flex;flex-wrap:wrap;gap:var(--space-xs)">${peopleList().map((n) => { const on = c.people.includes(n); return `<button type="button" ${opt(on)} data-act="c-person" data-id="${esc(n)}" style="height:44px;padding:0 var(--space-sm) 0 var(--space-2xs);border-radius:22px;display:inline-flex;align-items:center;gap:var(--space-xs)">${avatar(n, false).replace('class="avatar ', `class="avatar ${on ? 'dark ' : ''}`)}${esc(n)}</button>`; }).join('')}</div></fieldset>
        <div class="field"><span style="font-size:var(--text-sm);font-weight:500">รายการตรวจ <span class="hint u-w400">${c.checks.filter((x) => x.done).length} / ${c.checks.length}</span></span>
          <div class="box" style="border-radius:var(--radius-card)">${c.checks.map((x, i) => `<div class="list-row" style="grid-template-columns:minmax(0,1fr) auto;align-items:center;padding:var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm)"><span>${esc(x.text)}</span><button type="button" class="iconbtn" style="width:32px;height:32px" data-act="c-uncheck" data-id="${i}" aria-label="ลบรายการ ${esc(x.text)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`).join('')}
            <div style="display:flex;gap:var(--space-xs);padding:var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm);background:var(--hover)"><label for="cp-new" class="sr">เพิ่มรายการตรวจ</label><input id="cp-new" data-c="newCheck" value="${esc(c.newCheck)}" placeholder="เพิ่มรายการตรวจ แล้วกด Enter" style="flex:1;min-width:0;height:40px;border:0;background:transparent" autocomplete="off"><button type="button" class="btn small" data-act="c-add">เพิ่ม</button></div></div></div>
        <div class="field"><label for="cp-note">รายละเอียดเพิ่มเติม</label><textarea id="cp-note" data-c="note" rows="3" placeholder="อาการที่พบ สิ่งที่ต้องระวัง">${esc(c.note)}</textarea></div>
      </div>
      <div class="cfoot"><span class="hint" id="cp-hint" style="${ready ? '' : 'color:var(--stop-fg)'}">${ready ? (c.people.length ? `มอบหมาย ${c.people.length} คน` : 'ยังไม่มอบหมาย งานจะเข้าคิวรวม') : 'ใส่ชื่องานและเลือกเครื่องก่อนสร้าง'}</span>
        <div class="actions"><button type="button" class="btn" data-act="panel-close">ยกเลิก</button><button class="btn solid" id="cp-submit" ${ready ? '' : 'disabled'}>สร้างงาน</button></div></div>
    </form></div>`;
}

function drawer() {
  const w = state.page === 'work' && state.workOrders.find((x) => x.id === state.selectedWo);
  document.body.style.overflow = w || state.panel ? 'hidden' : '';
  if (!w) return createPanel();
  return `<div class="drawer-wrap"><button type="button" class="scrim" data-act="close-drawer" aria-label="ปิดรายละเอียด" tabindex="-1"></button>
    <div class="drawer" role="dialog" aria-modal="true" aria-label="ใบสั่งงาน ${esc(w.id)}">
      <div class="dhead"><span class="mono dim">${esc(w.id)}</span><button type="button" class="iconbtn" data-act="close-drawer" aria-label="ปิด"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="dbody">${woDetail(w)}</div>
    </div></div>`;
}

/* ---------- SH-03 เครื่องจักร ---------- */
function fieldsForm(kind, title, fields) {
  const d = state.draft;
  const html = fields.map(([name, label, type = 'text', extra = '']) => `<div class="field"><label for="f-${name}">${label}</label>${
    type === 'asset'
      ? `<select id="f-${name}" name="${name}" required>${state.assets.map((a) => `<option value="${esc(a.id)}" ${d[name] === a.id ? 'selected' : ''}>${esc(a.id)} ${esc(a.name)}</option>`).join('')}</select>`
      : type === 'cls'
        ? `<select id="f-${name}" name="${name}">${['A', 'B', 'C'].map((c) => `<option ${(d[name] || 'B') === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`
        : `<input id="f-${name}" name="${name}" type="${type}" value="${esc(d[name])}" ${extra}>`
  }</div>`).join('');
  return `<form class="box" data-form="${kind}"><div class="bar"><h2>${title}</h2></div><div class="pad">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:var(--space-sm) var(--space-md)">${html}</div>
    <div class="actions"><button class="btn solid">บันทึก</button><button type="button" class="btn" data-act="close-form">ยกเลิก</button></div></div></form>`;
}

const FIELDS = {
  assets: [['id', 'รหัสเครื่อง เช่น MNT-103', 'text', 'required pattern="[A-Za-z0-9\\-]+"'], ['name', 'ชื่อเครื่อง', 'text', 'required'], ['line', 'ตำแหน่ง'], ['cls', 'ระดับความสำคัญ', 'cls'], ['maker', 'ผู้ผลิต'], ['model', 'รุ่น'], ['year', 'ปีที่ติดตั้ง']],
  pmPlans: [['asset', 'เครื่องจักร', 'asset'], ['task', 'งานที่ต้องทำ', 'text', 'required'], ['intervalDays', 'ทำทุกกี่วัน', 'number', 'required min="1"'], ['first', 'ครบกำหนด', 'date', 'required']],
  parts: [['id', 'รหัส', 'text', 'required pattern="[A-Za-z0-9.\\-]+"'], ['name', 'รายการ', 'text', 'required'], ['bin', 'ที่เก็บ'], ['qty', 'คงเหลือ', 'number', 'required min="0"'], ['min', 'จุดสั่งซื้อ (Min)', 'number', 'required min="0"'], ['max', 'สต็อกสูงสุด (Max)', 'number', 'min="0"']],
  gauges: [['id', 'รหัส เช่น GAU-008', 'text', 'required pattern="[A-Za-z0-9.\\-]+"'], ['name', 'ชื่อเครื่องมือ', 'text', 'required'], ['range', 'ช่วงการวัด'], ['location', 'ที่ตั้ง / เครื่องที่ใช้'], ['intervalDays', 'รอบสอบเทียบ (วัน)', 'number', 'required min="1"'], ['first', 'ครบกำหนดสอบเทียบ', 'date', 'required']]
};
const COLL_LABEL = { assets: 'เครื่องจักร', pmPlans: 'แผน PM', parts: 'อะไหล่', gauges: 'เครื่องมือวัด' };
// แบบฟอร์มเพิ่มหรือแก้ไข ใช้ชุดช่องเดียวกัน ตอนแก้ไขไม่ให้เปลี่ยนรหัส
function recordForm(coll) {
  const editing = state.form === `edit-${coll}`;
  if (state.form !== coll && !editing) return '';
  const fields = FIELDS[coll].filter(([name]) => !(editing && name === 'id') && !(editing && coll === 'parts' && name === 'qty'));
  return fieldsForm(editing ? `edit-${coll}` : coll, `${editing ? 'แก้ไข' : 'เพิ่ม'}${COLL_LABEL[coll]}${editing && state.draft.id ? ` ${state.draft.id}` : ''}`, fields);
}

function viewAssets(m) {
  const form = recordForm('assets');
  const a = assetOf(state.selectedAsset) || state.assets[0];
  const stateOf = (id) => {
    const wo = m.open.find((w) => w.asset === id && w.type === 'breakdown');
    if (!wo) return ['run', 'เดินเครื่อง'];
    return wo.status === 'parts' ? ['parts', 'รออะไหล่'] : ['doing', 'หยุดเสีย'];
  };
  const rows = state.assets.map((x) => {
    const [s, label] = stateOf(x.id);
    return `<tr class="pick" data-act="open-asset" data-id="${esc(x.id)}"${x.id === a?.id ? ' aria-current="true"' : ''}>
      <td><span class="u-row">${andon(machineState(x).k)}<button type="button" class="link tagl" data-act="open-asset" data-id="${esc(x.id)}">${esc(x.id)}</button></span></td><td>${esc(x.name)}</td>
      <td class="dim">${esc(x.line)}</td><td class="mono">${esc(x.cls || '—')}</td>
      <td class="mono num">${hours(mergedDown(x.id, m.from, m.now))}</td>
      <td>${s === 'run' ? '<span class="lamp" style="--c:var(--run)">เดินเครื่อง</span>' : lamp(s, label)}</td></tr>`;
  }).join('');
  let detail = '';
  if (a) {
    const hist = state.workOrders.filter((w) => w.asset === a.id).slice(0, 8);
    const pms = state.pmPlans.filter((p) => p.asset === a.id).sort((x, y) => x.dueDate - y.dueDate);
    const t0 = startOfToday();
    detail = `<div class="split">
      <section class="box w2"><div class="bar"><h2 style="display:flex;gap:var(--space-sm);align-items:baseline"><span class="mono">${esc(a.id)}</span>${esc(a.name)}</h2><span class="actions">${editBtn('assets', a.id)}${delBtn('assets', a.id, 'ลบเครื่องนี้')}</span></div>
        <dl class="facts"><div><dt>ตำแหน่ง</dt><dd>${esc(a.line || '—')}</dd></div><div><dt>ระดับความสำคัญ</dt><dd>${esc(a.cls || '—')}</dd></div>
          <div><dt>ผู้ผลิต</dt><dd>${esc(a.maker || '—')}</dd></div><div><dt>รุ่น</dt><dd class="mono">${esc(a.model || '—')}</dd></div>
          <div><dt>ปีที่ติดตั้ง</dt><dd class="mono">${esc(a.year || '—')}</dd></div><div><dt>หยุด 7 วัน</dt><dd class="mono">${hours(mergedDown(a.id, m.from, m.now))} ชม.</dd></div></dl>
        <div class="bar" style="border-top:1px solid var(--ink)"><h2>แผน PM ของเครื่องนี้</h2></div>
        ${pms.map((p) => `<div class="list-row"><span class="mono ${p.dueDate < t0 ? 'alarm' : ''}">${fmtDate(p.dueDate)}</span><span class="t"><span>${esc(p.task)}</span><span class="s">ทุก ${p.intervalDays} วัน</span></span><span></span></div>`).join('') || '<p class="empty">ยังไม่มีแผน PM</p>'}
      </section>
      <section class="box w3 u-gap0"><div class="bar"><h2>ประวัติงาน</h2></div>
        ${hist.length ? `<div class="scroll"><table style="min-width:520px"><thead><tr><th scope="col">วันที่</th><th scope="col">งาน</th><th scope="col">สาเหตุ</th><th scope="col" class="num">หยุด (ชม.)</th></tr></thead><tbody>
          ${hist.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}"><td class="mono u-nowrap">${fmtDate(w.startAt)}</td><td>${esc(w.title)}<span class="sub"><span class="mono">${esc(w.id)}</span><span>${STATUS[w.status][0]}</span></span></td><td class="mono">${esc(w.cause || '—')}</td><td class="mono num">${['inspect', 'improve'].includes(w.type) ? '—' : hours((w.endAt ?? m.now) - w.startAt)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">ยังไม่มีงาน</p>'}</section></div>`;
  }
  return `${form}<section class="box" aria-label="ทะเบียนเครื่องจักร">${rows ? `<div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">รหัส</th><th scope="col">ชื่อเครื่อง</th><th scope="col">ตำแหน่ง</th><th scope="col">ระดับ</th><th scope="col" class="num">หยุด 7 วัน</th><th scope="col">สถานะ</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">ยังไม่มีเครื่องจักร</p>'}</section>${detail}`;
}

/* ---------- SH-04 แผน PM ---------- */
function viewPm() {
  const form = recordForm('pmPlans');
  const t0 = startOfToday();
  const c = pmCompliance(Date.now() - 30 * DAY);
  const summary = `<section class="stats" aria-label="สรุปแผน PM">
    <div class="stat"><span class="label">PM compliance 30 วัน</span><span class="fig ${c.pct < 90 ? 'alarm' : ''}">${c.pct.toFixed(0)}<small>%</small></span><span class="cap">ทันกำหนด ${c.onTime} จาก ${c.done + c.late} งาน · เป้า 90%</span></div>
    <div class="stat"><span class="label">เลยกำหนดตอนนี้</span><span class="fig ${c.late ? 'alarm' : ''}">${c.late}<small> งาน</small></span><span class="cap">นับรวมเป็นงานไม่ทันกำหนด</span></div>
    <div class="stat"><span class="label">แผน PM ทั้งหมด</span><span class="fig">${state.pmPlans.length}<small> แผน</small></span><span class="cap">ครอบคลุม ${new Set(state.pmPlans.map((p) => p.asset)).size} จาก ${state.assets.length} เครื่อง</span></div>
  </section>`;
  const groups = [['เลยกำหนด', (d) => d < t0, true], ['ภายใน 7 วัน', (d) => d >= t0 && d <= t0 + 7 * DAY], ['ถัดไป', (d) => d > t0 + 7 * DAY]];
  const html = groups.map(([label, test, late]) => {
    const items = state.pmPlans.filter((p) => test(p.dueDate)).sort((a, b) => a.dueDate - b.dueDate);
    if (!items.length) return '';
    return `<section class="box"><div class="bar"><h2 class="${late ? 'alarm' : ''}">${label} <span class="mono dim u-small">${items.length}</span></h2></div>
      <div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">ครบกำหนด</th><th scope="col">เครื่อง</th><th scope="col">งาน</th><th scope="col">รอบ</th><th scope="col"><span class="sr">คำสั่ง</span></th></tr></thead><tbody>
      ${items.map((p) => `<tr><td class="mono ${late ? 'alarm' : ''} u-nowrap">${fmtDate(p.dueDate)}</td><td>${tag(p.asset)}</td><td>${esc(p.task)}</td><td class="dim u-nowrap">ทุก ${p.intervalDays} วัน</td>
        <td class="num"><span class="actions u-end">${canTech() ? `<button type="button" class="btn small" data-act="pm-done" data-id="${esc(p.id)}">บันทึกว่าทำแล้ว</button>` : ''}${editBtn('pmPlans', p.id)}${delBtn('pmPlans', p.id)}</span></td></tr>`).join('')}
      </tbody></table></div></section>`;
  }).join('');
  return `${form}${summary}${html || '<section class="box"><p class="empty">ยังไม่มีแผน PM</p></section>'}`;
}

/* ---------- SH-05 อะไหล่ ---------- */
function viewParts() {
  const form = recordForm('parts');
  const toOrder = (p) => (p.qty <= p.min ? Math.max((p.max || p.min * 2 || 1) - p.qty, 1) : 0);
  const rows = [...state.parts].sort((a, b) => a.qty / (a.min || 1) - b.qty / (b.min || 1)).map((p) => `<tr>
    <td class="mono u-nowrap">${esc(p.id)}</td><td>${esc(p.name)}</td><td class="mono">${esc(p.bin)}</td>
    <td class="mono num ${p.qty === 0 ? 'alarm' : ''}">${p.qty} / ${p.min}</td><td class="mono num">${p.max || '—'}</td>
    <td class="mono num">${toOrder(p) ? `<b>${toOrder(p)}</b>` : '<span class="dim">—</span>'}</td>
    <td class="num"><span class="actions u-end">${canTech() ? `<button type="button" class="btn small" data-act="part" data-id="${esc(p.id)}" data-delta="1">รับเข้า 1</button>` : ''}${editBtn('parts', p.id)}${delBtn('parts', p.id)}</span></td></tr>`).join('');
  const orders = state.parts.filter(toOrder);
  return `${form}<section class="box" aria-label="คลังอะไหล่">${rows ? `<div class="scroll"><table style="min-width:860px"><thead><tr><th scope="col">รหัส</th><th scope="col">รายการ</th><th scope="col">ที่เก็บ</th><th scope="col" class="num">คงเหลือ / Min</th><th scope="col" class="num">Max</th><th scope="col" class="num">ควรสั่ง</th><th scope="col"><span class="sr">คำสั่ง</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">ยังไม่มีอะไหล่</p>'}</section>
    <div class="actions"><button type="button" class="btn" data-act="export-order" ${orders.length ? '' : 'disabled'}>ส่งออกรายการสั่งซื้อ ${orders.length} รายการ (CSV)</button><span class="hint">เบิกอะไหล่ทำผ่านใบสั่งงาน เพื่อให้รู้ว่าใช้กับเครื่องไหน</span></div>`;
}

/* ---------- SH-06 เครื่องมือวัด ---------- */
function viewGauges() {
  const form = recordForm('gauges');
  const order = { hold: 0, late: 1, soon: 2, ok: 3 };
  const list = [...state.gauges].sort((a, b) => order[gaugeState(a)[0]] - order[gaugeState(b)[0]] || a.dueDate - b.dueDate);
  const n = (k) => state.gauges.filter((g) => gaugeState(g)[0] === k).length;
  const rows = list.map((g) => {
    const [k, label, c, b] = gaugeState(g);
    return `<tr><td class="mono u-nowrap">${esc(g.id)}</td><td>${esc(g.name)}<span class="sub">${esc(g.range || '')}</span></td><td>${esc(g.location || '—')}</td>
      <td class="dim u-nowrap">ทุก ${g.intervalDays} วัน</td><td class="mono u-nowrap">${g.lastCal ? fmtDateY(g.lastCal) : '—'}</td>
      <td class="mono ${k === 'late' ? 'alarm' : ''} u-nowrap">${fmtDateY(g.dueDate)}</td>
      <td><span class="lamp" style="--c:${c};--b:${b}">${label}</span>${g.note ? `<span class="sub">${esc(g.note)}</span>` : ''}</td>
      <td class="num"><span class="actions u-end">${canTech() ? `<button type="button" class="btn small" data-act="cal" data-id="${esc(g.id)}" data-pass="1">ผ่าน</button><button type="button" class="btn small" data-act="cal" data-id="${esc(g.id)}" data-pass="0" ${g.status === 'hold' ? 'disabled' : ''}>ไม่ผ่าน</button>` : ''}${editBtn('gauges', g.id)}${delBtn('gauges', g.id)}</span></td></tr>`;
  }).join('');
  return `${form}<section class="stats" aria-label="สรุปเครื่องมือวัด">
      <div class="stat"><span class="label">ห้ามใช้</span><span class="fig ${n('hold') ? 'alarm' : ''}">${n('hold')}</span><span class="cap">ไม่ผ่านสอบเทียบ แยกออกจากไลน์</span></div>
      <div class="stat"><span class="label">เลยกำหนด</span><span class="fig ${n('late') ? 'alarm' : ''}">${n('late')}</span><span class="cap">ต้องหยุดใช้จนกว่าจะสอบเทียบ</span></div>
      <div class="stat"><span class="label">ครบภายใน 30 วัน</span><span class="fig">${n('soon')}</span><span class="cap">วางแผนส่งสอบเทียบ</span></div>
      <div class="stat"><span class="label">ใช้งานได้</span><span class="fig">${n('ok')}<small> / ${state.gauges.length}</small></span><span class="cap">อยู่ในรอบสอบเทียบ</span></div>
    </section>
    <section class="box" aria-label="ทะเบียนเครื่องมือวัด">${rows ? `<div class="scroll"><table style="min-width:960px"><thead><tr><th scope="col">รหัส</th><th scope="col">เครื่องมือ</th><th scope="col">ที่ตั้ง</th><th scope="col">รอบ</th><th scope="col">สอบเทียบล่าสุด</th><th scope="col">ครบกำหนด</th><th scope="col">สถานะ</th><th scope="col"><span class="sr">คำสั่ง</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">ยังไม่มีเครื่องมือวัด</p>'}</section>
    <p class="notice">ISO 9001 ข้อ 7.1.5.2: ถ้าเครื่องมือไม่ผ่านการสอบเทียบ ต้องประเมินว่าผลการวัดตั้งแต่สอบเทียบครั้งก่อนยังเชื่อถือได้หรือไม่ และบันทึกการดำเนินการ</p>`;
}

/* ---------- SH-07 รายงาน KPI ---------- */
function viewReport() {
  const now = Date.now();
  const from = now - state.period * DAY;
  const { rows, causes } = periodStats(from, now);
  const total = rows.reduce((s, r) => ({ fails: s.fails + r.fails, down: s.down + r.down }), { fails: 0, down: 0 });
  const span = (now - from) * (rows.length || 1);
  const closed = state.workOrders.filter((w) => w.type === 'breakdown' && w.endAt && w.endAt >= from);
  const mttr = closed.length ? closed.reduce((s, w) => s + w.endAt - w.startAt, 0) / closed.length : 0;
  const pmc = pmCompliance(from);
  const ranked = [...rows].sort((a, b) => b.down - a.down);
  const maxDown = Math.max(...ranked.map((r) => r.down), 1);
  const causeTotal = causes.reduce((s, [, n]) => s + n, 0);
  let cum = 0;
  const chips = [7, 30, 90].map((d) => `<button type="button" data-act="period" data-id="${d}" aria-pressed="${state.period === d}">${d} วัน</button>`).join('');
  return `<div class="u-spread"><div class="chips" role="group" aria-label="ช่วงเวลา">${chips}</div>
      <button type="button" class="btn" data-act="export-kpi">ส่งออก CSV</button></div>
    <section class="stats" aria-label="สรุป KPI">
      <div class="stat"><span class="label">Availability</span><span class="fig">${(100 * (1 - total.down / span)).toFixed(1)}<small>%</small></span><span class="cap">หยุดรวม ${hours(total.down)} ชม.</span></div>
      <div class="stat"><span class="label">MTBF</span><span class="fig">${total.fails ? hours((span - total.down) / total.fails) : '—'}<small> ชม.</small></span><span class="cap">เครื่องเสีย ${total.fails} ครั้ง</span></div>
      <div class="stat"><span class="label">MTTR</span><span class="fig">${hours(mttr)}<small> ชม.</small></span><span class="cap">จากงานซ่อมที่ปิดแล้ว ${closed.length} ใบ</span></div>
      <div class="stat"><span class="label">PM compliance</span><span class="fig ${pmc.pct < 90 ? 'alarm' : ''}">${pmc.pct.toFixed(0)}<small>%</small></span><span class="cap">ทันกำหนด ${pmc.onTime} จาก ${pmc.done + pmc.late} งาน</span></div>
    </section>
    <div class="split">
      <section class="box w3 u-gap0"><div class="bar"><h2>เวลาหยุดรายเครื่อง ${state.period} วัน</h2></div>
        <div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">เครื่อง</th><th scope="col" style="width:34%">เวลาหยุด (ชม.)</th><th scope="col" class="num">เสีย</th><th scope="col" class="num">MTBF</th><th scope="col" class="num">MTTR</th><th scope="col" class="num">Avail.</th></tr></thead><tbody>
        ${ranked.map((r, i) => `<tr class="pick" data-act="open-asset" data-id="${esc(r.a.id)}"><td>${tag(r.a.id)} <span class="dim">${esc(r.a.name)}</span></td>
          <td><span class="u-row"><span style="height:10px;width:${((r.down / maxDown) * 100).toFixed(1)}%;min-width:${r.down ? 2 : 0}px;background:${i === 0 && r.down ? 'var(--stop)' : 'var(--ink-2)'}"></span><span class="mono">${hours(r.down)}</span></span></td>
          <td class="mono num">${r.fails}</td><td class="mono num">${r.mtbf == null ? '—' : hours(r.mtbf)}</td><td class="mono num">${r.mttr == null ? '—' : hours(r.mttr)}</td><td class="mono num">${r.avail.toFixed(1)}%</td></tr>`).join('')}
        </tbody></table></div></section>
      <section class="box w2 u-gap0"><div class="bar"><h2>สาเหตุการเสีย (Pareto)</h2></div>
        ${causes.length ? `<table><thead><tr><th scope="col">รหัส</th><th scope="col">สาเหตุ</th><th scope="col" class="num">ครั้ง</th><th scope="col" class="num">สะสม</th></tr></thead><tbody>
          ${causes.map(([k, nn]) => { cum += nn; return `<tr><td class="mono">${esc(k)}</td><td>${esc((CAUSES.find(([c]) => c === k) || [, k])[1])}</td><td class="mono num">${nn}</td><td class="mono num">${((100 * cum) / causeTotal).toFixed(0)}%</td></tr>`; }).join('')}
        </tbody></table>` : '<p class="empty">ยังไม่มีงานซ่อมที่ปิดพร้อมรหัสสาเหตุในช่วงนี้</p>'}
        <p class="hint u-pad-sm">เลือกแก้สาเหตุที่สะสมถึงราว 80% ก่อน จะลดเวลาหยุดได้มากที่สุด</p></section>
    </div>`;
}

/* ---------- SH-08 ตั้งค่า ---------- */
const ROLE_LABEL = { admin: 'หัวหน้า / แอดมิน', tech: 'ช่างซ่อมบำรุง', operator: 'ฝ่ายผลิต', disabled: 'ปิดใช้งาน' };
const IMPORT_COLS = {
  assets: ['id', 'name', 'line', 'cls', 'maker', 'model', 'year'],
  parts: ['id', 'name', 'bin', 'qty', 'min', 'max']
};
const IMPORT_SAMPLE = {
  assets: [['MNT-103', 'เครื่องติดตั้งชิ้นส่วนความเร็วสูง', 'ไลน์ SMT 1', 'A', '', '', '2562']],
  parts: [['NZL-1005', 'หัวดูด ขนาด 1005', 'A-02', '2', '6', '12']]
};

// อ่าน CSV รองรับเครื่องหมายคำพูด และ BOM จาก Excel (บันทึกแบบ CSV UTF-8)
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function importRows(coll, text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('ไฟล์ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  if (!head.includes('id') || !head.includes('name')) throw new Error(`หัวตารางต้องมีคอลัมน์ ${IMPORT_COLS[coll].join(', ')}`);
  const out = []; const errors = [];
  rows.slice(1).forEach((r, i) => {
    const o = {};
    head.forEach((h, j) => { if (IMPORT_COLS[coll].includes(h)) o[h] = (r[j] ?? '').trim(); });
    o.id = (o.id || '').toUpperCase();
    if (!/^[A-Z0-9.\-]+$/.test(o.id)) { errors.push(`แถว ${i + 2}: รหัส "${o.id}" ใช้ได้แค่ A-Z 0-9 . -`); return; }
    if (!o.name) { errors.push(`แถว ${i + 2}: ไม่มีชื่อ`); return; }
    if (coll === 'assets') o.cls = ['A', 'B', 'C'].includes((o.cls || '').toUpperCase()) ? o.cls.toUpperCase() : 'B';
    if (coll === 'parts') ['qty', 'min', 'max'].forEach((k) => { o[k] = Math.max(0, Number(o[k]) || 0); });
    out.push(o);
  });
  return { coll, rows: out, errors };
}

// รหัสผ่านชั่วคราวแสดงครั้งเดียว ไม่บันทึกที่ไหน
function issuedBox() {
  const x = state.issued;
  if (!x) return '';
  return `<div class="notice u-mbox"><b>${esc(x.title)}</b>
    <dl class="kv" style="margin:var(--space-xs) 0"><dt>ชื่อ</dt><dd>${esc(x.name)}</dd><dt>รหัสพนักงาน</dt><dd class="mono">${esc(x.empId)}</dd><dt>รหัสผ่านชั่วคราว</dt><dd class="mono" style="font-size:var(--text-lg);letter-spacing:.08em">${esc(x.temp)}</dd></dl>
    <p class="hint" style="margin:0 0 var(--space-xs)">จดหรือแจ้งพนักงานตอนนี้ ปิดกล่องนี้แล้วจะดูรหัสนี้อีกไม่ได้ พนักงานต้องตั้งรหัสใหม่ตอนเข้าครั้งแรก</p>
    <div class="actions"><button type="button" class="btn small" data-act="copy-temp">คัดลอก</button><button type="button" class="btn small" data-act="issued-close">ปิด</button></div></div>`;
}

function viewServer() {
  const b = state.backend;
  const live = b.mode === 'firebase';
  const admin = canAdmin();
  const colls = { assets: 'เครื่อง', workOrders: 'ใบงาน', pmPlans: 'แผน PM', parts: 'อะไหล่', gauges: 'เครื่องมือวัด' };
  const account = `<section class="box"><div class="bar"><h2>บัญชีของฉัน</h2></div>
    <dl class="kv u-pad"><dt>ชื่อ</dt><dd>${esc(state.user.name)}</dd><dt>รหัสพนักงาน</dt><dd class="mono">${esc(state.user.empId || '—')}</dd><dt>สิทธิ์</dt><dd>${esc(ROLE_LABEL[state.user.role] || 'ยังไม่มีสิทธิ์')}</dd></dl>
    ${live ? `<form class="pad stack u-pt0" data-form="mypass">
      <div class="field"><label for="m-old">รหัสผ่านเดิม</label><input id="m-old" name="current" type="password" required autocomplete="current-password"></div>
      <div class="field"><label for="m-new">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input id="m-new" name="next" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label for="m-new2">ยืนยันรหัสผ่านใหม่</label><input id="m-new2" name="next2" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="actions"><button class="btn">เปลี่ยนรหัสผ่าน</button><button type="button" class="btn" data-act="logout">ออกจากระบบ</button></div></form>` : ''}</section>`;
  if (!admin) return `<div class="split"><div class="w2" style="max-width:560px">${account}</div></div>`;

  const users = [...state.users].sort((x, y) => (x.role === 'disabled') - (y.role === 'disabled') || x.name.localeCompare(y.name, 'th'));
  const usersBox = `<section class="box"><div class="bar"><h2>ผู้ใช้งาน <span class="mono dim u-small">${users.filter((u) => u.role !== 'disabled').length}</span></h2></div>
    ${live ? `<form class="pad" data-form="user" style="border-bottom:1px solid var(--rule)"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:var(--space-sm);align-items:end">
      <div class="field"><label for="u-name">ชื่อที่แสดง</label><input id="u-name" name="name" required autocomplete="off"></div>
      <div class="field"><label for="u-emp">รหัสพนักงาน</label><input id="u-emp" name="empId" required autocomplete="off" autocapitalize="characters" spellcheck="false" pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{1,19}" title="A-Z 0-9 . _ - ยาว 2–20 ตัว" placeholder="เช่น M0112"></div>
      <div class="field"><label for="u-role">สิทธิ์</label><select id="u-role" name="role">${['operator', 'tech', 'admin'].map((r) => `<option value="${r}">${ROLE_LABEL[r]}</option>`).join('')}</select></div>
      <button class="btn solid">เพิ่มผู้ใช้</button></div>
      <p class="hint">ระบบจะสร้างรหัสผ่านชั่วคราวให้ แจ้งพนักงานด้วยตัวเอง พนักงานต้องตั้งรหัสใหม่ตอนเข้าครั้งแรก</p></form>
      ${issuedBox()}` : '<p class="notice u-mbox">โหมดตัวอย่างแสดงรายชื่อตัวอย่าง เพิ่มผู้ใช้จริงได้หลังเชื่อม Firebase</p>'}
    <div class="scroll"><table style="min-width:680px"><thead><tr><th scope="col">ชื่อ</th><th scope="col">รหัสพนักงาน</th><th scope="col">สิทธิ์</th><th scope="col"><span class="sr">รหัสผ่าน</span></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td><span class="u-row">${avatar(u.name)}${esc(u.name)}${u.id === state.user.uid ? ' <span class="dim">(คุณ)</span>' : ''}</span></td><td class="mono">${esc(u.empId || '—')}${u.mustChange ? ' <span class="dim u-sans">· ยังไม่ได้ตั้งรหัส</span>' : ''}</td>
      <td>${u.id === state.user.uid || !live ? esc(ROLE_LABEL[u.role] || u.role) : `<label for="r-${esc(u.id)}" class="sr">สิทธิ์ของ ${esc(u.name)}</label><select id="r-${esc(u.id)}" data-user-role="${esc(u.id)}" style="height:34px;padding:0 var(--space-xs);border:1px solid var(--field);border-radius:var(--radius-card);background:var(--card)">${['admin', 'tech', 'operator', 'disabled'].map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select>`}</td>
      <td class="num">${live && u.id !== state.user.uid && u.empId ? `<button type="button" class="btn small" data-act="reset-user" data-id="${esc(u.id)}">รีเซ็ตรหัสผ่าน</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div></section>`;

  const p = state.importPreview;
  const importBox = `<section class="box w3"><div class="bar"><h2>นำเข้าข้อมูลจาก Excel</h2></div><div class="pad">
    <p class="dim">บันทึกไฟล์ Excel เป็น "CSV UTF-8" ใช้หัวตารางตามไฟล์ตัวอย่าง รหัสซ้ำจะอัปเดตข้อมูลเดิม</p>
    <div class="actions"><button type="button" class="btn small" data-act="tpl" data-id="assets">ไฟล์ตัวอย่าง เครื่องจักร</button><button type="button" class="btn small" data-act="tpl" data-id="parts">ไฟล์ตัวอย่าง อะไหล่</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:var(--space-sm)">
      <div class="field"><label for="imp-assets">นำเข้าเครื่องจักร</label><input id="imp-assets" type="file" accept=".csv,text/csv" data-import="assets"></div>
      <div class="field"><label for="imp-parts">นำเข้าอะไหล่</label><input id="imp-parts" type="file" accept=".csv,text/csv" data-import="parts"></div>
    </div>
    ${p ? `<div class="notice ${p.errors.length && !p.rows.length ? 'err' : ''}"><b>${p.coll === 'assets' ? 'เครื่องจักร' : 'อะไหล่'} ${p.rows.length} รายการพร้อมนำเข้า</b>${p.rows.length ? `: ${p.rows.slice(0, 3).map((r) => esc(r.id)).join(', ')}${p.rows.length > 3 ? ' …' : ''}` : ''}
      ${p.errors.length ? `<ul style="margin:var(--space-2xs) 0 0;padding-left:var(--space-md)">${p.errors.slice(0, 5).map((e) => `<li>${esc(e)}</li>`).join('')}${p.errors.length > 5 ? `<li>และอีก ${p.errors.length - 5} แถว</li>` : ''}</ul>` : ''}</div>
      <div class="actions"><button type="button" class="btn solid" data-act="import-go" ${p.rows.length ? '' : 'disabled'}>นำเข้า ${p.rows.length} รายการ</button><button type="button" class="btn" data-act="import-cancel">ยกเลิก</button></div>` : ''}
  </div></section>`;

  const plantBox = `<section class="box"><div class="bar"><h2>ข้อมูลโรงงาน</h2><span class="lamp" style="--c:${live ? 'var(--ok)' : 'var(--run)'}">${live ? 'เชื่อมฐานข้อมูลจริงแล้ว' : 'โหมดตัวอย่าง'}</span></div><div class="pad">
    ${live ? `<form class="stack u-gap-sm" data-form="plant"><div class="field"><label for="p-name">ชื่อโรงงาน / บริษัท</label><input id="p-name" name="plant" value="${esc(state.setup?.plant || '')}" required></div><div class="field"><label for="p-dept">แผนก</label><input id="p-dept" name="dept" value="${esc(state.setup?.dept || '')}"></div><div class="actions"><button class="btn small">บันทึก</button></div></form>
      <p class="hint">โปรเจกต์ Firebase: <span class="mono">${esc(b.projectId)}</span></p>
      ${state.canSeed ? '<div class="actions"><button type="button" class="btn solid" data-act="seed">ใส่ข้อมูลตัวอย่างเพื่อทดลอง</button></div><p class="hint">ฐานข้อมูลยังว่าง จะใส่ข้อมูลตัวอย่างไว้ลองก่อน หรือนำเข้าข้อมูลจริงจาก Excel ก็ได้</p>' : ''}`
    : `<p class="dim">ข้อมูลตอนนี้เก็บในเบราว์เซอร์เครื่องนี้เท่านั้น ยังไม่มีระบบล็อกอิน ใช้ดูหน้าตาและทดลองก่อนตั้งค่า Firebase</p>
      <form class="stack u-gap-sm" data-form="config"><div class="field"><label for="s-config">firebaseConfig (ถ้ามีแล้ว)</label>
      <textarea id="s-config" name="config" class="code" rows="6" spellcheck="false" required placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };'>${esc(state.draft.config)}</textarea></div>
      <div class="actions"><button class="btn solid">เชื่อมต่อเครื่องนี้</button><button type="button" class="btn" data-act="reset-demo">รีเซ็ตข้อมูลตัวอย่าง</button></div></form>`}
    ${state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}</div></section>`;

  const backupBox = `<section class="box"><div class="bar"><h2>สำรองข้อมูล</h2></div>
    <div class="pad"><p class="dim">ดาวน์โหลดข้อมูลทั้งหมด ${COLLECTIONS.map((c) => `${state[c].length.toLocaleString()} ${colls[c]}`).join(', ')} เป็นไฟล์ JSON เก็บไว้เป็นหลักฐานหรือย้ายระบบ</p>
    <div class="actions"><button type="button" class="btn" data-act="backup">ดาวน์โหลดไฟล์สำรอง</button></div></div></section>`;

  return `${usersBox}<div class="split">${importBox}<div class="w2">${plantBox}${account}${backupBox}</div></div>`;
}

// ชื่อที่แสดง: "โรงงาน / แผนก"
function placeName() {
  const x = state.setup || {};
  return [x.plant, x.dept].filter(Boolean).join(' / ');
}

function authShell(title, body) {
  const plant = placeName();
  return `<div class="login"><div class="authcard">
    <div class="bar" style="display:flex;align-items:center;gap:var(--space-sm)"><div><b class="authname">CMMS</b>${plant ? `<span class="authplant">${esc(plant)}</span>` : ''}<span class="authtitle">${title}</span></div></div>
    ${body}</div></div>`;
}

function viewLogin() {
  const err = state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : '';
  const note = state.notice ? `<p class="notice">${esc(state.notice)}</p>` : '';
  const fromFile = !savedConfig();
  return authShell('เข้าสู่ระบบ', `<form class="pad" data-form="login">
    <div class="field"><label for="l-emp">รหัสพนักงาน</label><input id="l-emp" name="empId" autocomplete="username" autocapitalize="characters" spellcheck="false" required value="${esc(state.draft.empId)}"></div>
    <div class="field"><label for="l-pass">รหัสผ่าน</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
    ${err}${note}
    <button class="btn solid u-center">เข้าสู่ระบบ</button>
    <p class="hint u-tc">ลืมรหัสผ่านหรือยังไม่มีบัญชี ให้หัวหน้าซ่อมบำรุงรีเซ็ตหรือเพิ่มให้ในหน้าตั้งค่า</p>
    ${fromFile ? '' : '<button type="button" class="btn small" style="align-self:center" data-act="disconnect">เลิกเชื่อมต่อเครื่องนี้</button>'}</form>`);
}

// เข้าด้วยรหัสชั่วคราว ต้องตั้งรหัสของตัวเองก่อนใช้งาน
function viewFirstPassword() {
  const err = state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : '';
  return authShell('ตั้งรหัสผ่านของคุณ', `<form class="pad" data-form="firstpass">
    <p class="dim">สวัสดี ${esc(state.user.name)} (${esc(state.user.empId)}) คุณเข้าด้วยรหัสผ่านชั่วคราว ตั้งรหัสผ่านของคุณเองก่อนใช้งาน</p>
    <div class="field"><label for="f-new">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input id="f-new" name="next" type="password" minlength="8" required autocomplete="new-password"></div>
    <div class="field"><label for="f-new2">ยืนยันรหัสผ่านใหม่</label><input id="f-new2" name="next2" type="password" minlength="8" required autocomplete="new-password"></div>
    ${err}
    <button class="btn solid u-center">บันทึกรหัสผ่าน</button>
    <button type="button" class="btn u-center" data-act="logout">ออกจากระบบ</button></form>`);
}

function viewSetup() {
  const err = state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : '';
  return authShell('ตั้งค่าครั้งแรก', `<form class="pad" data-form="setup">
    <p class="dim">ฐานข้อมูลนี้ยังไม่มีผู้ดูแล บัญชีที่สร้างตอนนี้จะเป็นหัวหน้า / แอดมินคนแรก และหน้านี้จะปิดทันทีหลังตั้งค่าเสร็จ</p>
    <div class="field"><label for="s-plant">ชื่อโรงงาน / บริษัท</label><input id="s-plant" name="plant" required placeholder="เช่น Orbray โรงงาน 2" value="${esc(state.draft.plant)}"></div>
    <div class="field"><label for="s-dept">แผนก</label><input id="s-dept" name="dept" placeholder="เช่น ซ่อมบำรุง" value="${esc(state.draft.dept)}"></div>
    <div class="field"><label for="s-name">ชื่อของคุณ</label><input id="s-name" name="name" required autocomplete="name" value="${esc(state.draft.name)}"></div>
    <div class="field"><label for="s-emp">รหัสพนักงานของคุณ (ใช้ล็อกอิน)</label><input id="s-emp" name="empId" required autocomplete="username" autocapitalize="characters" spellcheck="false" placeholder="เช่น M0001" value="${esc(state.draft.empId)}"></div>
    <div class="field"><label for="s-pass">รหัสผ่าน (อย่างน้อย 8 ตัว)</label><input id="s-pass" name="password" type="password" minlength="8" required autocomplete="new-password"></div>
    <div class="field"><label for="s-pass2">ยืนยันรหัสผ่าน</label><input id="s-pass2" name="password2" type="password" minlength="8" required autocomplete="new-password"></div>
    ${err}
    <button class="btn solid u-center">สร้างบัญชีแอดมินและเริ่มใช้งาน</button></form>`);
}

/* ---------- วาดหน้า ---------- */
function render() {
  if (!state.backend || state.user === undefined) { app.innerHTML = '<p class="u-p-lg">กำลังโหลด</p>'; return; }
  if (state.needSetup) { document.body.style.overflow = ''; app.innerHTML = viewSetup(); return; }
  if (!state.user) { document.body.style.overflow = ''; app.innerHTML = viewLogin(); return; }
  if (state.user.mustChange) { document.body.style.overflow = ''; app.innerHTML = viewFirstPassword(); return; }
  const m = metrics();
  const counts = { work: m.open.length, assets: state.assets.length, pm: m.pmSoon.length, parts: m.low.length, gauges: m.gaugeAlert.length || '' };
  const nav = Object.entries(PAGES).map(([k, [, label]]) => `<button type="button" data-act="nav" data-id="${k}" ${state.page === k ? 'aria-current="page"' : ''}>${icon(NAV_ICON[k])}<span>${label}</span><span class="n">${counts[k] ?? ''}</span></button>`).join('');
  const views = { quick: viewQuick, overview: viewOverview, board: viewBoard, work: viewWork, assets: viewAssets, pm: viewPm, parts: viewParts, gauges: viewGauges, report: viewReport, server: viewServer };
  const noRole = !state.user.role;
  const [, , full] = PAGES[state.page];
  const add = canAdmin() && ADD_LABEL[state.page] ? `<button type="button" class="btn" data-act="add" data-id="${state.page}">${ADD_LABEL[state.page]}</button>` : '';
  const tv = state.page === 'board' ? `<button type="button" class="btn" data-act="tv">${icon('<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>')}${state.tv ? 'ออกจากโหมดจอ' : 'โหมดจอทีวี'}</button>` : '';
  const report = noRole || state.page === 'quick' ? '' : `<button type="button" class="btn solid" data-act="report">${icon('<path d="M12 5v14M5 12h14"/>')}แจ้งซ่อม</button>`;
  const role = { admin: 'หัวหน้า / แอดมิน', tech: 'ช่างซ่อมบำรุง', operator: 'ฝ่ายผลิต' }[state.user.role] || 'ยังไม่มีสิทธิ์';
  const where = state.backend.mode === 'firebase' ? (placeName() || state.backend.projectId) : 'ข้อมูลตัวอย่างในเครื่องนี้';
  const sync = state.lastSync ? `ซิงก์ ${fmtTime(state.lastSync)}` : '';
  app.classList.toggle('quickmode', state.page === 'quick');
  const plantLine = state.backend.mode === 'firebase' ? [state.setup?.plant, state.setup?.dept].filter(Boolean) : ['ข้อมูลตัวอย่าง'];
  app.innerHTML = `<div class="shell">
      <aside class="side">
        <div class="brand" title="${esc(placeName())}"><span class="bt"><b>CMMS</b>${plantLine.map((x) => `<span>${esc(x)}</span>`).join('')}</span></div>
        <div class="searchwrap"><span class="sicon">${icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>')}</span><label for="q" class="sr">ค้นหาเครื่อง ใบงาน อะไหล่ เครื่องมือวัด</label><input id="q" class="search" type="search" autocomplete="off" placeholder="ค้นหาทั้งระบบ" value="${esc(state.q)}"><div id="q-res" class="qres" hidden></div></div>
        <nav class="nav" aria-label="เมนูหลัก">${nav}</nav>
        <div class="me">${avatar(state.user.name, false)}<span class="who"><b>${esc(state.user.name)}</b><span>${esc(role)}</span></span>${state.backend.mode === 'firebase' ? '<button type="button" data-act="logout">ออกจากระบบ</button>' : ''}</div>
      </aside>
      <main>
        <header class="head"><div><h1>${full}</h1><p class="meta"><span>${today()}</span><span>${esc(where)}</span>${sync ? `<span>${sync}</span>` : ''}</p></div>
          <div class="actions">${tv}${add}${report}</div></header>
        ${state.backend.mode === 'local' ? `<p class="notice demo">โหมดตัวอย่าง: ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้นและไม่มีล็อกอิน ${canAdmin() ? '<button type="button" class="link u-sans" data-act="nav" data-id="server">ตั้งค่าเพื่อใช้งานจริง</button>' : ''}</p>` : ''}
        ${noRole ? `<p class="notice err">${state.user.disabled ? 'บัญชีนี้ถูกปิดใช้งาน ติดต่อหัวหน้าซ่อมบำรุง' : 'บัญชีนี้ยังไม่ได้รับสิทธิ์ ติดต่อหัวหน้าซ่อมบำรุงให้เพิ่มในหน้าตั้งค่า'}</p>` : ''}
        ${state.loadError && state.page !== 'server' ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}
        ${noRole && state.page !== 'server' ? '' : views[state.page](m)}
      </main>
    </div>${drawer()}${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ''}`;
}

// ข้อมูลเรียลไทม์อาจมาตอนคนกำลังพิมพ์หรือกดเมาส์ค้าง จึงพักการวาดใหม่ไว้ก่อน
let pending = false;
let pointerDown = false;
function refresh() {
  const el = document.activeElement;
  if (pointerDown || (el && el !== document.body && el.matches('input,textarea,select'))) { pending = true; return; }
  render();
}
function flush() {
  if (pending && !pointerDown && !document.activeElement?.matches('input,textarea,select')) { pending = false; render(); }
}
document.addEventListener('pointerdown', () => { pointerDown = true; });
document.addEventListener('pointerup', () => { pointerDown = false; setTimeout(flush, 50); });
document.addEventListener('focusout', () => setTimeout(flush));

let toastTimer;
// ข้อความแจ้งเตือนวาดแยกจากหน้า จึงขึ้นทันทีแม้คนกำลังพิมพ์อยู่
function paintToast() {
  let el = app.querySelector('.toast');
  if (!state.toast) { el?.remove(); return; }
  if (!el) { el = Object.assign(document.createElement('div'), { className: 'toast' }); el.setAttribute('role', 'status'); app.append(el); }
  el.textContent = state.toast;
}
function toast(msg) {
  state.toast = msg;
  paintToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = ''; paintToast(); }, 3200);
}
async function run(task, okMsg) {
  try {
    await task();
    if (okMsg) toast(okMsg);
  } catch (err) {
    console.error(err);
    toast(explain(err));
  }
}
function explain(err) {
  const code = err?.code || '';
  if (code.includes('permission-denied')) return 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้';
  if (code.includes('unavailable') || code.includes('failed-precondition') || code === 'auth/network-request-failed') return 'ต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่เมื่อมีสัญญาณ';
  if (code === 'auth/email-already-in-use') return 'รหัสพนักงานนี้มีบัญชีอยู่แล้ว';
  if (code === 'auth/requires-recent-login') return 'ต้องออกจากระบบแล้วเข้าใหม่ก่อนเปลี่ยนรหัสผ่าน';
  if (code === 'auth/weak-password') return 'รหัสผ่านสั้นหรือง่ายเกินไป ใช้อย่างน้อย 8 ตัว';
  if (code === 'auth/invalid-email') return 'รหัสพนักงานไม่ถูกต้อง';
  if (code === 'auth/too-many-requests') return 'ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่ หรือให้หัวหน้ารีเซ็ตรหัสผ่าน';
  if (code === 'auth/operation-not-allowed') return 'ยังไม่ได้เปิด Email/Password ใน Firebase console (ระบบใช้เบื้องหลังสำหรับรหัสพนักงาน)';
  if (code.startsWith('auth/')) return 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง';
  return err?.message || 'ทำรายการไม่สำเร็จ';
}

function listen() {
  state.unsubs.forEach((u) => u());
  const usersUnsub = state.backend.subscribeUsers((rows) => { state.users = rows; refresh(); }, (err) => console.warn('อ่านรายชื่อผู้ใช้ไม่ได้', err));
  state.unsubs = COLLECTIONS.map((c) => state.backend.subscribe(c, (rows) => {
    state[c] = c === 'assets' ? rows.sort((a, b) => a.id.localeCompare(b.id)) : (c === 'workOrders' ? rows.sort((a, b) => b.startAt - a.startAt) : rows);
    state.loadError = '';
    state.lastSync = Date.now();
    refresh();
  }, (err) => { console.error(err); state.loadError = explain(err); refresh(); }));
  state.unsubs.push(usersUnsub);
}

function go(page) {
  state.page = PAGES[page] ? page : 'overview';
  state.form = null;
  state.draft = {};
  state.q = '';
  if (location.hash.slice(1) !== state.page) history.replaceState(null, '', `#${state.page}`);
  render();
  window.scrollTo(0, 0);
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && state.tv) { state.tv = false; document.documentElement.classList.remove('tv'); render(); }
});
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (PAGES[p] && p !== state.page) go(p); });

function addLog(w, text) {
  return [...(w.log || []), { at: Date.now(), text }];
}

/* ---------- การกระทำ ---------- */
const actions = {
  nav: (id) => go(id),
  tv: () => {
    const on = !state.tv;
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    state.tv = on; document.documentElement.classList.toggle('tv', on); render();
  },
  filter: (id) => { state.filter = id; render(); },
  'open-wo': (id) => {
    const w = state.workOrders.find((x) => x.id === id);
    if (state.selectedWo !== id) state.close = { cause: w?.cause || '', action: w?.action || '' };
    if (state.page !== 'work') go('work');
    state.selectedWo = id;
    render();
    document.querySelector('.drawer .iconbtn')?.focus();
  },
  'close-drawer': () => { const id = state.selectedWo; state.selectedWo = null; render(); document.querySelector(`.trow [data-id="${CSS.escape(id || '')}"].check`)?.focus(); },
  scope: (id) => { state.scope = id; render(); },
  'toggle-group': (id) => { state.collapsed[id] = !state.collapsed[id]; render(); },
  'show-done': () => { state.showDone = true; render(); },
  'quick-open': () => { state.quick = true; state.collapsed.pending = false; state.draft = { asset: state.assets[0]?.id, priority: 'stop' }; render(); document.getElementById('qa-title')?.focus(); },
  'quick-cancel': () => { state.quick = false; state.draft = {}; render(); },
  'open-asset': (id) => { state.selectedAsset = id; if (state.page !== 'assets') go('assets'); else render(); window.scrollTo(0, 0); },
  report: () => {
    if (state.page !== 'work') go('work');
    state.selectedWo = null;
    state.panel = true;
    state.create = { title: '', type: 'breakdown', asset: state.assets[0]?.id || '', due: '', prio: 'stop', people: [state.user.name], checks: [{ text: 'ทำ LOTO ก่อนเริ่มงาน', done: false }], newCheck: '', note: '' };
    render();
    document.getElementById('cp-title')?.focus();
  },
  'panel-close': () => { state.panel = false; render(); },
  'qr-asset': (id) => { state.qr.asset = id; render(); },
  'qr-sym': (id) => { const q = state.qr; q.symptoms = q.symptoms.includes(id) ? q.symptoms.filter((x) => x !== id) : [...q.symptoms, id]; render(); },
  'qr-stop': (id) => { state.qr.stopped = id === '1'; render(); },
  'qr-photo-del': () => { state.qr.photo = null; render(); },
  'qr-again': () => { state.qr = freshQr(); render(); window.scrollTo(0, 0); },
  'c-type': (id) => {
    const c = state.create; c.type = id;
    if (id === 'pm' || id === 'improve') c.prio = 'plan';
    if (id === 'breakdown') c.prio = 'stop';
    render();
  },
  'c-prio': (id) => { state.create.prio = id; render(); },
  'c-person': (id) => { const c = state.create; c.people = c.people.includes(id) ? c.people.filter((x) => x !== id) : [...c.people, id]; render(); },
  'c-add': () => { const c = state.create; const t = c.newCheck.trim(); if (!t) return; c.checks.push({ text: t, done: false }); c.newCheck = ''; render(); document.getElementById('cp-new')?.focus(); },
  'c-uncheck': (id) => { state.create.checks.splice(Number(id), 1); render(); },
  add: (id) => { state.form = { pm: 'pmPlans' }[id] || id; state.draft = {}; render(); },
  edit: (id, el) => {
    const coll = el.dataset.coll;
    const rec = state[coll].find((x) => x.id === id);
    if (!rec) return;
    state.form = `edit-${coll}`;
    state.draft = { ...rec, first: rec.dueDate ? isoDate(rec.dueDate) : '' };
    render();
    document.querySelector(`form[data-form="edit-${coll}"]`)?.scrollIntoView({ block: 'start' });
  },
  period: (id) => { state.period = Number(id); render(); },
  cal: (id, el) => {
    const pass = el.dataset.pass === '1';
    run(() => state.backend.calibrate(id, pass, pass ? '' : 'ไม่ผ่านการสอบเทียบ ต้องประเมินผลการวัดย้อนหลัง'), pass ? `บันทึก ${id} ผ่านการสอบเทียบ` : `${id} เปลี่ยนเป็นห้ามใช้`);
  },
  'export-wo': () => {
    const rows = scopeList();
    download(`work-orders-${isoDate(Date.now())}.csv`, csv([
      ['เลขที่', 'เครื่อง', 'ประเภท', 'งาน', 'สถานะ', 'ผู้แจ้ง', 'ผู้อนุมัติ', 'ช่าง', 'แจ้งเมื่อ', 'ปิดเมื่อ', 'เวลาหยุด (ชม.)', 'รหัสสาเหตุ', 'การแก้ไข', 'อะไหล่ที่เบิก'],
      ...rows.map((w) => [w.id, w.asset, TYPE[w.type], w.title, STATUS[w.status][0], w.requestedBy, w.approvedBy, w.tech, fmtDateTime(w.startAt), w.endAt ? fmtDateTime(w.endAt) : '', ['inspect', 'improve'].includes(w.type) ? '' : hours((w.endAt ?? Date.now()) - w.startAt), w.cause, w.action, (w.partsUsed || []).map((u) => `${u.id}×${u.qty}`).join(' ')])
    ]));
  },
  'export-kpi': () => {
    const now = Date.now();
    const { rows } = periodStats(now - state.period * DAY, now);
    download(`kpi-${state.period}d-${isoDate(now)}.csv`, csv([
      ['เครื่อง', 'ชื่อ', 'ระดับ', 'เสีย (ครั้ง)', 'เวลาหยุด (ชม.)', 'MTBF (ชม.)', 'MTTR (ชม.)', 'Availability (%)'],
      ...rows.map((r) => [r.a.id, r.a.name, r.a.cls, r.fails, hours(r.down), r.mtbf == null ? '' : hours(r.mtbf), r.mttr == null ? '' : hours(r.mttr), r.avail.toFixed(1)])
    ]));
  },
  'export-order': () => {
    const rows = state.parts.filter((p) => p.qty <= p.min);
    download(`purchase-request-${isoDate(Date.now())}.csv`, csv([
      ['รหัส', 'รายการ', 'คงเหลือ', 'Min', 'Max', 'จำนวนที่ควรสั่ง'],
      ...rows.map((p) => [p.id, p.name, p.qty, p.min, p.max || '', Math.max((p.max || p.min * 2 || 1) - p.qty, 1)])
    ]));
  },
  backup: () => {
    const data = Object.fromEntries(COLLECTIONS.map((c) => [c, state[c]]));
    download(`cmms-backup-${isoDate(Date.now())}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), 'application/json');
  },
  'open-part': () => go('parts'),
  'open-gauge': () => go('gauges'),
  'close-form': () => { state.form = null; state.draft = {}; render(); },
  approve: () => {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    const me = state.user.name;
    run(() => state.backend.updateWorkOrder(w.id, { status: 'open', approvedBy: me, approvedAt: Date.now(), log: addLog(w, `${me} อนุมัติ`) }), 'อนุมัติแล้ว');
  },
  'wo-status': (status) => {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    const patch = { status };
    const tech = w.tech || state.user.name;
    if (!w.tech) patch.tech = tech;
    patch.log = addLog(w, status === 'parts' ? `${tech} เปลี่ยนสถานะเป็นรออะไหล่` : `${tech} ${w.status === 'parts' ? 'กลับมาซ่อมต่อ' : 'เริ่มซ่อม'}`);
    run(() => state.backend.updateWorkOrder(w.id, patch));
  },
  'wo-close': () => {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    const { cause, action } = state.close;
    if (!cause || !action.trim()) return;
    const tech = w.tech || state.user.name;
    run(() => state.backend.updateWorkOrder(w.id, {
      status: 'done', endAt: Date.now(), tech, cause, action: action.trim(), log: addLog(w, `${tech} ปิดงาน สาเหตุ ${cause}`)
    }), `ปิด ${w.id} แล้ว`);
  },
  'pm-done': (id) => run(() => state.backend.completePM(id, state.user.name), 'บันทึกแล้ว เลื่อนรอบถัดไปให้แล้ว'),
  part: (id, el) => run(() => state.backend.adjustPart(id, Number(el.dataset.delta))),
  del: (id, el) => {
    if (el.dataset.confirm) return run(() => state.backend.remove(el.dataset.coll, id), 'ลบแล้ว');
    el.dataset.confirm = '1';
    el.textContent = 'กดอีกครั้งเพื่อยืนยัน';
  },
  seed: () => run(async () => { await state.backend.seed(); state.canSeed = false; }, 'ใส่ข้อมูลตัวอย่างแล้ว'),
  'reset-demo': () => { state.backend.reset(); toast('รีเซ็ตแล้ว'); },
  disconnect: () => { clearConfig(); location.reload(); },
  logout: () => run(() => state.backend.signOut()),
  'reset-user': (id, el) => {
    const u = state.users.find((x) => x.id === id);
    if (!u) return;
    if (!el.dataset.confirm) { el.dataset.confirm = '1'; el.textContent = 'กดอีกครั้งเพื่อยืนยัน'; return; }
    el.disabled = true;
    run(async () => {
      const temp = await state.backend.resetUser(id);
      state.issued = { title: 'รีเซ็ตรหัสผ่านแล้ว', name: u.name, empId: u.empId, temp };
      render();
    });
  },
  'issued-close': () => { state.issued = null; render(); },
  'copy-temp': () => {
    const x = state.issued;
    if (!x) return;
    navigator.clipboard?.writeText(`รหัสพนักงาน ${x.empId} รหัสผ่านชั่วคราว ${x.temp}`).then(() => toast('คัดลอกแล้ว'), () => toast('คัดลอกไม่ได้ จดจากหน้าจอแทน'));
  },
  tpl: (id) => download(`template-${id}.csv`, csv([IMPORT_COLS[id], ...IMPORT_SAMPLE[id]])),
  'import-cancel': () => { state.importPreview = null; render(); },
  'import-go': () => {
    const p = state.importPreview;
    if (!p?.rows.length) return;
    run(async () => { await state.backend.importRows(p.coll, p.rows); state.importPreview = null; state.canSeed = false; render(); }, `นำเข้า ${p.rows.length} รายการแล้ว`);
  }
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (state.q && (!e.target.closest('.searchwrap') || el?.closest('.qres'))) { state.q = ''; const i = document.getElementById('q'); if (i) i.value = ''; paintSearch(); }
  if (!el || el.disabled) return;
  actions[el.dataset.act]?.(el.dataset.id, el);
});

// ค้นหา: อัปเดตเฉพาะกล่องผลลัพธ์ ไม่วาดทั้งหน้าใหม่ เคอร์เซอร์จะได้ไม่หลุด
function searchResults(q) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const has = (...v) => v.some((x) => String(x ?? '').toLowerCase().includes(t));
  return [
    ...state.workOrders.filter((w) => has(w.id, w.title, w.asset)).slice(0, 6).map((w) => ['open-wo', w.id, w.id, w.title, STATUS[w.status][0]]),
    ...state.assets.filter((a) => has(a.id, a.name, a.line)).slice(0, 4).map((a) => ['open-asset', a.id, a.id, a.name, 'เครื่องจักร']),
    ...state.parts.filter((p) => has(p.id, p.name)).slice(0, 4).map((p) => ['open-part', p.id, p.id, p.name, `อะไหล่ คงเหลือ ${p.qty}`]),
    ...state.gauges.filter((g) => has(g.id, g.name, g.location)).slice(0, 4).map((g) => ['open-gauge', g.id, g.id, g.name, `เครื่องมือวัด ${gaugeState(g)[1]}`])
  ];
}
function paintSearch() {
  const box = document.getElementById('q-res');
  if (!box) return;
  const res = searchResults(state.q);
  box.hidden = !state.q.trim();
  box.innerHTML = res.length
    ? res.map(([act, id, code, title, sub]) => `<button type="button" data-act="${act}" data-id="${esc(id)}"><span class="mono">${esc(code)}</span><span class="t"><span>${esc(title)}</span><span class="s">${esc(sub)}</span></span></button>`).join('')
    : '<p class="empty">ไม่พบรายการที่ตรงกัน</p>';
}
// กักโฟกัสในแผงที่ซ้อนหน้า (role=dialog, aria-modal) ให้ Tab วนอยู่ในแผง
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const dlg = document.querySelector('[aria-modal="true"]');
  if (!dlg) return;
  const items = [...dlg.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (!dlg.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// ตารางที่เลื่อนข้างได้ต้องรับโฟกัสคีย์บอร์ดและมีชื่อ (WCAG 2.1.1)
function labelScrollRegions() {
  document.querySelectorAll('.scroll').forEach((el) => {
    const wide = el.scrollWidth > el.clientWidth + 1;
    if (wide) {
      el.tabIndex = 0;
      el.setAttribute('role', 'region');
      const h = el.closest('section, .box')?.querySelector('h2');
      el.setAttribute('aria-label', `${h ? h.textContent.trim() : 'ตาราง'} (เลื่อนซ้ายขวาได้)`);
    } else {
      el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label');
    }
  });
}
new MutationObserver(() => labelScrollRegions()).observe(app, { childList: true });
window.addEventListener('resize', () => labelScrollRegions());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.panel && !state.q) { actions['panel-close'](); return; }
  if (e.key === 'Escape' && state.selectedWo && state.page === 'work' && !state.q) { actions['close-drawer'](); return; }
  if (e.key === 'Escape' && state.q) { state.q = ''; const i = document.getElementById('q'); if (i) i.value = ''; paintSearch(); }
});

app.addEventListener('input', (e) => {
  if (e.target.id === 'q') { state.q = e.target.value; paintSearch(); return; }
  const qk = e.target.dataset.qr;
  if (qk && state.qr) {
    state.qr[qk] = e.target.value;
    if (qk === 'filter') {
      const t = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#qr-assets [data-act="qr-asset"]').forEach((b) => {
        const a = assetOf(b.dataset.id);
        b.hidden = !!t && !`${a.id} ${a.name} ${a.line}`.toLowerCase().includes(t);
      });
    }
    return;
  }
  const ck = e.target.dataset.c;
  if (ck && state.create) {
    state.create[ck] = e.target.value;
    const ready = state.create.title.trim() && state.create.asset;
    const btn = document.getElementById('cp-submit'); if (btn) btn.disabled = !ready;
    const hint = document.getElementById('cp-hint');
    if (hint) { hint.textContent = ready ? (state.create.people.length ? `มอบหมาย ${state.create.people.length} คน` : 'ยังไม่มอบหมาย งานจะเข้าคิวรวม') : 'ใส่ชื่องานและเลือกเครื่องก่อนสร้าง'; hint.style.color = ready ? '' : 'var(--stop-fg)'; }
    return;
  }
  const key = e.target.dataset.close;
  if (!key) return;
  state.close[key] = e.target.value;
  const btn = app.querySelector('[data-act="wo-close"]');
  const ready = state.close.cause && state.close.action.trim();
  if (btn) btn.disabled = !ready;
  const hint = btn?.closest('.pad')?.querySelector('.hint');
  if (hint) hint.textContent = ready ? 'ปิดงานแล้วระบบจะบันทึกเวลาและเพิ่มเข้าประวัติเครื่อง' : 'เลือกรหัสสาเหตุและกรอกการแก้ไขที่ต้นเหตุก่อนปิดงาน';
});

app.addEventListener('keydown', (e) => {
  if (e.target.id === 'cp-new' && e.key === 'Enter') { e.preventDefault(); actions['c-add'](); }
});

app.addEventListener('change', (e) => {
  if (e.target.dataset.import && e.target.files?.[0]) {
    const coll = e.target.dataset.import;
    e.target.files[0].text().then((text) => {
      try { state.importPreview = importRows(coll, text); } catch (err) { state.importPreview = null; toast(err.message); }
      render();
    });
    return;
  }
  if (e.target.dataset.userRole) {
    const uid = e.target.dataset.userRole;
    const role = e.target.value;
    run(() => state.backend.updateUser(uid, { role }), `เปลี่ยนสิทธิ์เป็น ${ROLE_LABEL[role]} แล้ว`);
    return;
  }
  if (e.target.id === 'qr-file' && e.target.files?.[0]) {
    shrinkImage(e.target.files[0]).then((url) => { state.qr.photo = url; render(); }).catch((err) => toast(err.message));
    return;
  }
  if (e.target.dataset.rerender && state.create) { state.create[e.target.dataset.c] = e.target.value; render(); return; }
  if (e.target.dataset.check != null) {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    if (!w) return;
    const checks = (w.checks || []).map((c, i) => (i === Number(e.target.dataset.check) ? { ...c, done: e.target.checked } : c));
    run(() => state.backend.updateWorkOrder(w.id, { checks }));
    return;
  }
  if (e.target.dataset.close) { e.target.dispatchEvent(new Event('input', { bubbles: true })); return; }
  const key = e.target.dataset.save;
  if (!key) return;
  const w = state.workOrders.find((x) => x.id === state.selectedWo);
  const v = e.target.value.trim();
  if (w && v !== w.tech) run(() => state.backend.updateWorkOrder(w.id, { [key]: v, log: addLog(w, `มอบหมาย ${v || '—'}`) }));
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const d = Object.fromEntries(new FormData(form));
  const done = (msg) => { state.form = null; state.draft = {}; document.activeElement?.blur(); render(); if (msg) toast(msg); };
  const forms = {
    wo: () => run(async () => {
      const title = d.title.trim();
      if (!title) return;
      const me = state.user.name;
      const type = d.priority === 'stop' ? 'breakdown' : 'inspect';
      const id = await state.backend.createWorkOrder({ asset: d.asset, title, type, priority: d.priority, requestedBy: me, status: 'pending', log: [{ at: Date.now(), text: `${me} ${type === 'breakdown' ? 'แจ้งซ่อม' : 'แจ้งตรวจสอบ'}` }] });
      state.selectedWo = id; state.filter = 'active'; state.close = { cause: '', action: '' };
      done(`เปิด ${id} แล้ว รออนุมัติ`);
    }),
    qr: () => run(async () => {
      const q = state.qr;
      if (!q.asset || !q.symptoms.length || q.stopped === null) return;
      const me = state.user.name;
      const title = q.symptoms.join(', ') + (q.note.trim() ? ` · ${q.note.trim()}` : '');
      const type = q.stopped ? 'breakdown' : 'inspect';
      const id = await state.backend.createWorkOrder({
        asset: q.asset, title, type, priority: q.stopped ? 'stop' : 'slow', requestedBy: me, status: 'pending',
        note: q.note.trim(), photo: q.photo || '',
        log: [{ at: Date.now(), text: `${me} แจ้งงานด่วน${q.stopped ? ' เครื่องหยุด' : ''}${q.photo ? ' พร้อมรูป' : ''}` }]
      });
      q.sent = { id, asset: q.asset, title, stopped: q.stopped };
      document.activeElement?.blur();
      render();
      window.scrollTo(0, 0);
    }),
    create: () => run(async () => {
      const c = state.create;
      const title = c.title.trim();
      if (!title || !c.asset) return;
      const me = state.user.name;
      const id = await state.backend.createWorkOrder({
        asset: c.asset, title, type: c.type, priority: c.prio, requestedBy: me, status: 'pending',
        tech: c.people[0] || '', team: c.people, dueDate: c.due ? new Date(`${c.due}T00:00:00`).getTime() : null,
        checks: c.checks.map((x) => ({ text: x.text, done: false })), note: c.note.trim(),
        log: [{ at: Date.now(), text: `${me} สร้างงาน${c.people.length ? ` มอบหมาย ${c.people.join(', ')}` : ''}` }]
      });
      state.panel = false; state.create = null; state.collapsed.pending = false;
      render();
      toast(`สร้าง ${id} แล้ว รออนุมัติ`);
    }),
    quick: () => run(async () => {
      const title = (d.title || '').trim();
      if (!title) return;
      const me = state.user.name;
      const type = d.priority === 'stop' ? 'breakdown' : 'inspect';
      const id = await state.backend.createWorkOrder({ asset: d.asset, title, type, priority: d.priority, requestedBy: me, status: 'pending', log: [{ at: Date.now(), text: `${me} ${type === 'breakdown' ? 'แจ้งซ่อม' : 'แจ้งตรวจสอบ'}` }] });
      state.draft = { asset: d.asset, priority: d.priority };
      render();
      document.getElementById('qa-title')?.focus();
      toast(`เพิ่ม ${id} แล้ว รออนุมัติ`);
    }),
    assets: () => run(async () => {
      const id = d.id.trim().toUpperCase();
      if (assetOf(id)) throw new Error(`มีรหัส ${id} อยู่แล้ว`);
      const { id: _drop, ...rest } = d;
      await state.backend.put('assets', id, rest);
      state.selectedAsset = id; done('เพิ่มเครื่องแล้ว');
    }),
    pmPlans: () => run(async () => {
      await state.backend.put('pmPlans', null, { asset: d.asset, task: d.task.trim(), intervalDays: Number(d.intervalDays), dueDate: new Date(`${d.first}T00:00:00`).getTime() });
      done('เพิ่มแผนแล้ว');
    }),
    parts: () => run(async () => {
      const id = d.id.trim().toUpperCase();
      if (state.parts.some((p) => p.id === id)) throw new Error(`มีรหัส ${id} อยู่แล้ว`);
      await state.backend.put('parts', id, { name: d.name.trim(), bin: d.bin.trim(), qty: Number(d.qty), min: Number(d.min), max: Number(d.max) || 0 });
      done('เพิ่มอะไหล่แล้ว');
    }),
    gauges: () => run(async () => {
      const id = d.id.trim().toUpperCase();
      if (state.gauges.some((g) => g.id === id)) throw new Error(`มีรหัส ${id} อยู่แล้ว`);
      const dueDate = new Date(`${d.first}T00:00:00`).getTime();
      await state.backend.put('gauges', id, { name: d.name.trim(), range: d.range.trim(), location: d.location.trim(), intervalDays: Number(d.intervalDays), dueDate, lastCal: null, status: 'ok', note: '' });
      done('เพิ่มเครื่องมือวัดแล้ว');
    }),
    'edit-assets': () => run(async () => {
      const { name, line, cls, maker, model, year } = d;
      await state.backend.update('assets', state.draft.id, { name: name.trim(), line, cls, maker, model, year });
      done('บันทึกการแก้ไขแล้ว');
    }),
    'edit-pmPlans': () => run(async () => {
      await state.backend.update('pmPlans', state.draft.id, { asset: d.asset, task: d.task.trim(), intervalDays: Number(d.intervalDays), dueDate: new Date(`${d.first}T00:00:00`).getTime() });
      done('บันทึกการแก้ไขแล้ว');
    }),
    'edit-parts': () => run(async () => {
      await state.backend.update('parts', state.draft.id, { name: d.name.trim(), bin: d.bin.trim(), min: Number(d.min), max: Number(d.max) || 0 });
      done('บันทึกการแก้ไขแล้ว');
    }),
    'edit-gauges': () => run(async () => {
      await state.backend.update('gauges', state.draft.id, { name: d.name.trim(), range: d.range.trim(), location: d.location.trim(), intervalDays: Number(d.intervalDays), dueDate: new Date(`${d.first}T00:00:00`).getTime() });
      done('บันทึกการแก้ไขแล้ว');
    }),
    issue: () => run(async () => {
      const qty = Math.floor(Number(d.qty));
      if (!(qty > 0)) throw new Error('จำนวนต้องมากกว่า 0');
      const who = state.user.name;
      await state.backend.issuePart(state.selectedWo, d.part, qty, `${who} เบิก ${d.part} จำนวน ${qty}`);
      document.activeElement?.blur();
      toast(`เบิก ${d.part} จำนวน ${qty} แล้ว`);
    }),
    config: () => {
      try {
        saveConfig(parseConfig(d.config));
        location.reload();
      } catch (err) {
        state.draft.config = d.config;
        state.loadError = `อ่าน firebaseConfig ไม่ได้: ${err.message}`;
        render();
      }
    },
    login: async () => {
      try {
        state.loadError = ''; state.notice = '';
        state.draft = { empId: d.empId };
        await state.backend.signIn(d.empId, d.password);
        state.draft = {};
      } catch (err) {
        state.loadError = explain(err);
        render();
      }
    },
    firstpass: async () => {
      state.loadError = '';
      if (d.next !== d.next2) { state.loadError = 'รหัสผ่านสองช่องไม่ตรงกัน'; render(); return; }
      try {
        await state.backend.changePassword('', d.next);
        toast('ตั้งรหัสผ่านแล้ว');
      } catch (err) {
        state.loadError = explain(err);
        render();
      }
    },
    mypass: () => run(async () => {
      if (d.next !== d.next2) throw new Error('รหัสผ่านใหม่สองช่องไม่ตรงกัน');
      try {
        await state.backend.changePassword(d.current, d.next);
      } catch (err) {
        if (['auth/invalid-credential', 'auth/wrong-password'].includes(err?.code)) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
        throw err;
      }
      form.reset();
    }, 'เปลี่ยนรหัสผ่านแล้ว'),
    setup: async () => {
      state.loadError = '';
      state.draft = { plant: d.plant, dept: d.dept, name: d.name, empId: d.empId };
      if (d.password !== d.password2) { state.loadError = 'รหัสผ่านสองช่องไม่ตรงกัน'; render(); return; }
      try {
        const plant = d.plant.trim();
        const dept = (d.dept || '').trim();
        await state.backend.setupFirstAdmin({ plant, dept, name: d.name.trim(), empId: d.empId, password: d.password });
        state.setup = { plant, dept };
        state.needSetup = false;
        state.draft = {};
        await state.backend.refreshUser();
      } catch (err) {
        state.loadError = err?.code?.includes('permission-denied')
          ? 'ฐานข้อมูลปฏิเสธการสร้างบัญชี (permission-denied) ปิดแท็บ CMMS อื่นทั้งหมด แล้วกด Ctrl+F5 และลองใหม่ ถ้ายังขึ้นอีก ส่งภาพหน้าจอนี้ให้ผู้ดูแลระบบ'
          : `${explain(err)}${err?.code ? ` (${err.code})` : ''}`;
        render();
      }
    },
    user: () => run(async () => {
      const empId = d.empId.trim().toUpperCase();
      if (state.users.some((u) => u.empId === empId)) throw new Error(`มีรหัสพนักงาน ${empId} อยู่แล้ว`);
      const name = d.name.trim();
      const temp = await state.backend.createUser({ name, empId, role: d.role });
      state.issued = { title: 'เพิ่มผู้ใช้แล้ว', name, empId, temp };
      form.reset();
      render();
    }),
    plant: () => run(async () => {
      const plant = d.plant.trim();
      const dept = (d.dept || '').trim();
      await state.backend.updateSetup({ plant, dept });
      state.setup = { ...(state.setup || {}), plant, dept };
      render();
    }, 'บันทึกชื่อแล้ว')
  };
  forms[form.dataset.form]?.();
});

/* ---------- เริ่มระบบ ---------- */
(async function start() {
  const h = location.hash.slice(1);
  if (PAGES[h]) state.page = h;
  render();
  try {
    state.backend = await createBackend();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="login"><form><div class="bar"><b>เชื่อม Firebase ไม่สำเร็จ</b></div><div class="pad"><p class="notice err">${esc(err.message)}</p><button type="button" class="btn" id="fallback">กลับไปใช้ข้อมูลตัวอย่าง</button></div></form></div>`;
    document.getElementById('fallback').onclick = () => { clearConfig(); location.reload(); };
    return;
  }
  try {
    state.setup = await state.backend.getSetup();
    state.needSetup = state.backend.mode === 'firebase' && !state.setup;
  } catch (err) {
    console.error(err);
    state.loadError = err?.code?.includes('permission-denied') ? 'ยังไม่ได้ใส่กฎความปลอดภัย (firestore.rules) ใน Firebase console' : explain(err);
  }
  state.backend.onAuth(async (user) => {
    if (user && state.needSetup) return;
    state.user = user;
    state.unsubs.forEach((u) => u());
    state.unsubs = [];
    state.loadError = '';
    if (user?.role && !user.mustChange) {
      listen();
      if (user.role === 'admin') {
        try { state.canSeed = await state.backend.isEmpty(); } catch { state.canSeed = false; }
        if (state.canSeed) state.page = 'server';
      }
      if (user.role === 'operator' && !PAGES[location.hash.slice(1)]) state.page = 'quick';
    } else if (user && !user.mustChange) {
      state.page = 'server';
    }
    render();
  });
  setInterval(() => refresh(), 60000);
})();
