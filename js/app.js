import { fit, fitGoto, fitStep, fitActive, fitWanted, fitReveal, fitPref, setFitPref } from './fit.js?v=202611200940';
import { createBackend, parseConfig, saveConfig, savedConfig, clearConfig, startOfToday, COLLECTIONS } from './backend.js?v=202611200940';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const app = document.getElementById('app');

const STATUS = {
  pending: ['รออนุมัติ', 'var(--card)', '2px solid var(--ink)'],
  open: ['รอเริ่มงาน', 'var(--ink)', '0'],
  doing: ['กำลังซ่อม', 'var(--stop)', '0'],
  parts: ['รออะไหล่', 'var(--wait)', '0'],
  done: ['ปิดงานแล้ว', 'var(--run)', '0'],
  cancelled: ['ยกเลิก', 'var(--off)', '0']
};
// ระดับอะไหล่: อะไหล่ที่ยังไม่ตั้ง Min/Max และไม่มีของ (รายการจากรหัสอะไหล่/ใบสั่งซื้อ) ไม่ถือว่าหมดสต็อก
const tracked = (p) => (Number(p.min) || 0) > 0 || (Number(p.max) || 0) > 0 || (Number(p.qty) || 0) > 0;
const partLevel = (p) => (!tracked(p) ? 'none' : p.qty <= 0 ? 'out' : p.qty <= p.min ? 'low' : 'ok');
const needsOrder = (p) => tracked(p) && p.qty <= p.min;
// ใบงานที่ยังต้องทำ (ไม่นับที่ปิดแล้วหรือยกเลิก) และใบงานที่ใช้คำนวณสถิติ (ไม่นับที่ยกเลิก)
const isOpen = (w) => w.status !== 'done' && w.status !== 'cancelled';
const liveWO = () => state.workOrders.filter((w) => w.status !== 'cancelled');
const TYPE = { breakdown: 'ซ่อมฉุกเฉิน', pm: 'บำรุงรักษาตามแผน', inspect: 'แจ้งตรวจสอบ', improve: 'ปรับปรุง' };
const CAUSES = [
  ['C-LUB', 'ขาดการหล่อลื่น/ทำความสะอาด'], ['C-WEAR', 'ชิ้นส่วนสึกหรอตามอายุ'], ['C-PM', 'ไม่ได้ทำ PM ตามรอบ'],
  ['C-SET', 'ตั้งค่าหรือปรับแต่งผิด'], ['C-ELEC', 'ระบบไฟฟ้า/เซนเซอร์'], ['C-OPR', 'การใช้งานผิดวิธี'], ['C-OTH', 'อื่นๆ (ระบุในการแก้ไข)']
];
const FILTERS = {
  active: ['งานเปิดอยู่', (w) => isOpen(w)],
  pending: ['รออนุมัติ', (w) => w.status === 'pending'],
  doing: ['กำลังซ่อม', (w) => w.status === 'doing' || w.status === 'open'],
  parts: ['รออะไหล่', (w) => w.status === 'parts'],
  done: ['ปิดแล้ว', (w) => w.status === 'done']
};
const PAGES = {
  board: ['SH-09', 'แดชบอร์ด', 'แดชบอร์ดและภาพรวม'],
  plant: ['SH-10', 'แผนผังโรงงาน', 'แผนผังโรงงาน'],
  quick: ['SH-00', 'แจ้งซ่อมด่วน', 'แจ้งซ่อมด่วน'],
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
  assets: [], workOrders: [], pmPlans: [], parts: [], gauges: [], checklists: [], stockMoves: [], stock: null, tpm: {}, tpmSel: {}, tpmNg: null, af: { q: '', line: '', use: '', page: 0 }, boardAll: false, costYear: new Date().getFullYear(), pmYear: new Date().getFullYear(), pmView: 'list', pmMonth: null, pmDay: null,
  page: 'board', pg: {}, ver: 0, fitRows: {}, maps: [], mapId: loadPref('cmms.mapId'), mapEdit: false, mapAdding: false, mapNewName: '', mapFilter: '', mapSel: null, mapQ: '', mapLabels: false, mapBusy: false, tv: false, ovRange: 0, ovSel: null, filter: 'active', scope: 'all', quick: false, showDone: false, collapsed: {}, woView: 'table', woQ: '', woStatus: 'all', woPage: 0, woOpen: {}, woFilter: false, selectedWo: null, selectedAsset: null, period: 30, q: '', panel: false, create: null, qr: null, users: [], setup: null, needSetup: false, issued: null, notice: '', importPreview: null,
  form: null, draft: {}, close: { cause: '', action: '' }, cancelWo: null, hideCancelled: loadHideCancelled(), toast: '', canSeed: false, unsubs: []
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (opts) => (t) => new Intl.DateTimeFormat('th-TH', { hour12: false, ...opts }).format(t);
const fmtDate = fmt({ day: '2-digit', month: 'short' });
const fmtTime = fmt({ hour: '2-digit', minute: '2-digit' });
const fmtWd = fmt({ weekday: 'short' });
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
const PRANK = { stop: 3, slow: 2, plan: 1 };
// อายุใบงานแบบอ่านง่าย: ไม่ถึงวันแสดง ชม.:นาที เกินวันแสดงจำนวนวัน
const ageText = (ms) => (ms < DAY ? `${Math.floor(ms / 3600000)}:${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')} ชม.` : `${Math.floor(ms / DAY).toLocaleString('th-TH')} วัน`);
const PRIO = { stop: ['สูง', 'var(--stop-bg)', 'var(--stop-fg)'], slow: ['กลาง', 'var(--wait-bg)', 'var(--wait-fg)'], plan: ['ต่ำ', 'var(--grey-bg)', 'var(--grey-fg)'] };
const TYPE_STYLE = { breakdown: ['var(--stop)', 'var(--stop-bg)', 'var(--stop-fg)'], pm: ['var(--pm)', 'var(--pm-bg)', 'var(--pm-fg)'], inspect: ['var(--wait)', 'var(--grey-bg)', 'var(--grey-fg)'], improve: ['var(--ok)', 'var(--ok-bg)', 'var(--ok-fg)'] };
const priOf = (w) => w.priority || { breakdown: 'stop', inspect: 'slow', pm: 'plan' }[w.type] || 'plan';
const pill = (label, b, f) => `<span class="pill" style="--b:${b};--f:${f}">${esc(label)}</span>`;
// ตัวย่อชื่อ ข้ามสระหน้าเพื่อให้ได้พยัญชนะต้น
const ini = (name) => { if (!name) return '—'; const first = (w) => [...(w || '')].find((ch) => !'เแโใไ'.includes(ch)) || ''; const [a, b] = name.split(/\s+/); return first(a) + first(b); };
const avatar = (name, sm = true) => `<span class="avatar ${sm ? 'sm' : ''}" aria-hidden="true">${esc(ini(name))}</span>`;
const relDate = (t) => { const d0 = startOfToday(); if (t >= d0) return 'วันนี้'; if (t >= d0 - DAY) return 'เมื่อวาน'; return fmtDate(t); };
const NAV_ICON = {
  plant: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  quick: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
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
// ดัชนีใบงานและแผน PM ต่อเครื่อง สร้างใหม่เมื่อข้อมูลชุดใดชุดหนึ่งเปลี่ยน
// (เดิมทุกเครื่องไล่ใบงานทั้งหมด 743 x 1,000+ รอบต่อการวาดหนึ่งครั้ง)
let idx = { ver: -1 };
function index() {
  const day = startOfToday();
  if (idx.ver !== state.ver || idx.day !== day) {
    const byWo = new Map(); const byPm = new Map();
    for (const w of state.workOrders) if (w.asset) { const l = byWo.get(w.asset); if (l) l.push(w); else byWo.set(w.asset, [w]); }
    for (const pl of state.pmPlans) { const l = byPm.get(pl.asset); if (l) l.push(pl); else byPm.set(pl.asset, [pl]); }
    idx = { ver: state.ver, day, byWo, byPm, ms: new Map() };
  }
  return idx;
}
const wosOf = (id) => index().byWo.get(id) || [];
const pmsOf = (id) => index().byPm.get(id) || [];

// เวลาหยุดเครื่อง: ไม่นับใบที่ยกเลิก และใบย้อนหลังจาก Job Request (มีแต่วันที่ ไม่มีเวลาหยุดจริง)
const timed = (w) => w.status !== 'cancelled' && (!w.imported || w.hasTime);
function mergedDown(assetId, from, to) {
  const spans = wosOf(assetId)
    .filter((w) => timed(w) && !['inspect', 'improve'].includes(w.type))
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
  const doneIn = liveWO().filter((w) => w.type === 'pm' && !w.imported && w.endAt && w.endAt >= from);
  const late = state.pmPlans.filter((p) => p.dueDate < startOfToday()).length;
  const total = doneIn.length + late;
  return { pct: total ? (100 * doneIn.filter((w) => w.onTime !== false).length) / total : 100, done: doneIn.length, late, onTime: doneIn.filter((w) => w.onTime !== false).length };
}

// ตัวเลขรายเครื่องในช่วงเวลาที่เลือก
function periodStats(from, to) {
  const span = to - from;
  const rows = state.assets.map((a) => {
    const fails = wosOf(a.id).filter((w) => w.status !== 'cancelled' && w.type === 'breakdown' && (w.endAt ?? to) >= from && w.startAt <= to);
    const closed = fails.filter((w) => w.endAt && timed(w));
    const down = mergedDown(a.id, from, to);
    return {
      a, fails: fails.length, down,
      mtbf: fails.length ? (span - down) / fails.length : null,
      mttr: closed.length ? closed.reduce((s, w) => s + w.endAt - w.startAt, 0) / closed.length : null,
      avail: 100 * (1 - down / span)
    };
  });
  const causes = {};
  liveWO().filter((w) => w.type === 'breakdown' && w.endAt && w.endAt >= from && w.cause).forEach((w) => { causes[w.cause] = (causes[w.cause] || 0) + 1; });
  return { rows, causes: Object.entries(causes).sort((x, y) => y[1] - x[1]) };
}

function metrics() {
  const now = Date.now();
  const from = startOfToday() - 6 * DAY;
  const open = state.workOrders.filter((w) => isOpen(w));
  const stopped = [...new Set(open.filter((w) => w.type === 'breakdown').map((w) => w.asset))];
  const down = state.assets.reduce((s, a) => s + mergedDown(a.id, from, now), 0);
  const cap = state.assets.length * (now - from);
  const fails = liveWO().filter((w) => w.type === 'breakdown' && (w.endAt ?? now) >= from && w.startAt <= now);
  const closed = fails.filter((w) => w.endAt && timed(w));
  const mttr = closed.length ? closed.reduce((s, w) => s + w.endAt - w.startAt, 0) / closed.length : 0;
  const t0 = startOfToday();
  const pmSoon = state.pmPlans.filter((p) => p.dueDate <= t0 + 7 * DAY);
  const pmLate = state.pmPlans.filter((p) => p.dueDate < t0);
  const low = state.parts.filter(needsOrder);
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
  stop: ['หยุดเสีย', 'stop'], wait: ['รออะไหล่', 'wait'], pm: ['กำลังทำ PM', 'pm'], late: ['PM เลยกำหนด', 'late'], run: ['เดินเครื่อง', 'run'], idle: ['สำรอง', 'idle'], off: ['ไม่ได้ใช้งาน', 'off']
};
// สถานะการใช้งานของเครื่อง (ตั้งโดยแอดมิน) แยกจากสถานะงานซ่อม
const USE = { inuse: ['ใช้งาน', 'In Use'], standby: ['สำรอง', 'Standby'], unused: ['หยุดใช้งาน', 'Unused'], cancelled: ['ยกเลิก', 'Cancelled'] };
const useOf = (a) => (USE[a?.use] ? a.use : 'inuse');
const inService = (a) => !['unused', 'cancelled'].includes(useOf(a));
function normUse(v) {
  const t = String(v || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  return Object.keys(USE).find((k) => k === t || USE[k][1].toLowerCase().replace(/\s/g, '') === t || USE[k][0] === String(v || '').trim()) || 'inuse';
}
function machineState(a) {
  const memo = index().ms;
  let r = memo.get(a.id);
  if (!r) { r = machineStateRaw(a); memo.set(a.id, r); }
  return r;
}
function machineStateRaw(a) {
  // ใบงานย้อนหลังจาก Job Request ไม่ได้บอกว่าเครื่องหยุดหรือไม่ จึงไม่ใช้ตัดสินสถานะเครื่อง (ยังอยู่ในคิวงานตามปกติ)
  const open = wosOf(a.id).filter((w) => isOpen(w) && (!w.imported || w.hasTime));
  const brk = open.filter((w) => w.type === 'breakdown').sort((x, y) => x.startAt - y.startAt);
  const stop = brk.find((w) => w.status !== 'parts');
  if (stop) return { k: 'stop', w: stop, since: stop.startAt };
  const wait = brk.find((w) => w.status === 'parts') || open.find((w) => w.status === 'parts');
  if (wait) return { k: 'wait', w: wait, since: wait.startAt };
  const pm = open.find((w) => w.type === 'pm' && w.status === 'doing');
  if (pm) return { k: 'pm', w: pm, since: pm.startAt };
  if (!inService(a)) return { k: 'off' };
  const late = pmsOf(a.id).find((p) => p.dueDate < startOfToday());
  if (late) return { k: 'late', plan: late, since: late.dueDate };
  if (useOf(a) === 'standby') return { k: 'idle' };
  return { k: 'run' };
}
// แถบสัดส่วน: ช่องละสถานะ กว้างตามจำนวน
const meter = (parts, label) => {
  const total = parts.reduce((s, x) => s + x.n, 0) || 1;
  return `<div class="meter" role="img" aria-label="${esc(label)}">${parts.filter((x) => x.n).map((x) => `<span class="m-${x.k}" style="flex:${x.n}"></span>`).join('')}</div>
    <ul class="mkey">${parts.map((x) => `<li><i class="m-${x.k}" aria-hidden="true"></i>${esc(x.label)}<b class="mono">${x.n}</b></li>`).join('')}</ul>`;
};
// กราฟแท่งรายเดือน: หลายชุดข้อมูลวางคู่กันในแต่ละเดือน ตัวเลขพิมพ์ไว้บนแท่ง
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function mbars(cols, series, label, fmtV = (v) => String(v)) {
  const max = Math.max(1, ...cols.flatMap((c) => c.values));
  return `<div class="mb" style="--n:${cols.length}" role="img" aria-label="${esc(label)}">
    <div class="mb-plot">${cols.map((c) => `<div class="mb-col${c.on ? ' on' : ''}" title="${esc(`${c.label}: ${series.map((sr, i) => `${sr.name} ${fmtV(c.values[i])}`).join(', ')}`)}">${c.values.map((v, i) => `<span class="mb-bar ${series[i].cls || `mb-s${i}`}" style="height:${((100 * v) / max).toFixed(1)}%">${v ? `<b>${fmtV(v)}</b>` : ''}</span>`).join('')}</div>`).join('')}</div>
    <div class="mb-x">${cols.map((c) => `<span class="${c.on ? 'on' : ''}">${esc(c.label)}</span>`).join('')}</div>
    <ul class="mkey inline">${series.map((sr, i) => `<li><i class="${sr.cls || `mb-s${i}`}" aria-hidden="true"></i>${esc(sr.name)}<b class="mono">${fmtV(cols.reduce((t, c) => t + c.values[i], 0))}</b></li>`).join('')}</ul>
  </div>`;
}
const baht = (v) => Math.round(v).toLocaleString('th-TH');
const ago = (t) => { const ms = Date.now() - t; return ms < DAY ? `${hm(ms)} ชม.` : `${Math.floor(ms / DAY)} วัน`; };

// ---------- แผนผังโรงงาน: รูปแผนผังของแต่ละอาคาร/โรงงาน + จุดตำแหน่งเครื่อง ----------
// แผนผังแต่ละรูปเป็นเอกสารใน maps ({name, img, w, h, order}) เครื่องเก็บ mapId + mapX/mapY (สัดส่วน 0–1 ของรูป)
const lineOf = (a) => a.line || 'ไม่ระบุไลน์';
const LOOSE = '_loose';
// รหัสเอกสารรูปแผนผัง: ตัวอักษรอังกฤษจากชื่อ + แฮชกันชื่อซ้ำ
function mapDocId(name) {
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `map-${slug ? `${slug}-` : ''}${h.toString(36)}`;
}
const mapName = (m) => m?.name || m?.line || '';
const mapsSorted = () => [...state.maps].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || mapName(a).localeCompare(mapName(b)));
const mapById = (id) => state.maps.find((m) => m.id === id);
const placed = (a) => !!a.mapId && typeof a.mapX === 'number' && typeof a.mapY === 'number' && !!mapById(a.mapId);
const onMap = (id) => state.assets.filter((a) => a.mapId === id && placed(a));
const looseAssets = () => state.assets.filter((a) => !placed(a));
function curMap() {
  const ms = mapsSorted();
  const ok = state.mapId === LOOSE ? looseAssets().length > 0 || !ms.length : !!mapById(state.mapId);
  if (!ok) state.mapId = (ms.map((m) => [m.id, onMap(m.id).length]).sort((p, q) => q[1] - p[1])[0] || [LOOSE])[0];
  return state.mapId;
}
const isBad = (k) => ['stop', 'wait'].includes(k);
function plantTabs(cur) {
  const ms = mapsSorted();
  const loose = looseAssets();
  const tab = (id, label, list) => {
    const bad = list.filter((a) => isBad(machineState(a).k)).length;
    return `<button type="button" data-act="map-tab" data-id="${esc(id)}" aria-pressed="${id === cur}">${esc(label)} <span class="mono dim">${list.length}</span>${bad ? ` <span class="pt-bad mono" title="หยุดเสีย/รออะไหล่">${bad}</span>` : ''}</button>`;
  };
  const tabs = ms.map((m) => tab(m.id, mapName(m), onMap(m.id)));
  if (loose.length) tabs.push(tab(LOOSE, ms.length ? 'ยังไม่ได้วางบนแผนผัง' : 'ทุกเครื่อง (ผังโซน)', loose));
  return tabs.length > 1 ? `<div class="chips ptabs" role="group" aria-label="เลือกแผนผัง">${tabs.join('')}</div>` : '';
}
// โซนอัตโนมัติสำหรับเครื่องที่ยังไม่ได้วาง: แยกตามไลน์ แล้วตามกระบวนการ (ถ้าไม่ระบุใช้ชื่อเครื่อง)
const zoneOf = (a) => (String(a.area || '').split('/')[0].trim() || String(a.name || 'ไม่ระบุ')).toUpperCase().replace(/\s+/g, ' ');
const MAP_ORDER = ['stop', 'wait', 'pm', 'late', 'idle', 'run', 'off'];
const byState = (p, q) => MAP_ORDER.indexOf(p.k) - MAP_ORDER.indexOf(q.k) || p.a.id.localeCompare(q.a.id);
function zoneMap(list, edit = false) {
  const cell = (x) => `<button type="button" class="pm-cell k-${x.k}${edit && state.mapSel === x.a.id ? ' sel' : ''}" data-act="${edit ? 'map-pick' : 'open-asset'}" data-id="${esc(x.a.id)}" title="${esc(`${x.a.id} ${x.a.name} ${MSTATE[x.k][0]}`)}" aria-label="${esc(`${x.a.id} ${MSTATE[x.k][0]}`)}"></button>`;
  const lines = new Map();
  list.forEach((a) => { const l = lineOf(a); if (!lines.has(l)) lines.set(l, []); lines.get(l).push({ a, k: machineState(a).k }); });
  return [...lines].sort((p, q) => q[1].length - p[1].length).map(([l, xs]) => {
    const zones = new Map();
    xs.forEach((x) => { const z = zoneOf(x.a); if (!zones.has(z)) zones.set(z, []); zones.get(z).push(x); });
    return `<div class="zline" data-flow><h3>${esc(l)} <span class="dim mono">${xs.length}</span></h3><div class="zmap" role="group" aria-label="ผังโซน ${esc(l)}">${[...zones].sort((p, q) => q[1].length - p[1].length).map(([z, zs]) => {
      const bad = zs.filter((x) => !['run', 'idle', 'off'].includes(x.k)).length;
      return `<div class="zone${bad ? ' zbad' : ''}" style="flex-grow:${Math.min(zs.length, 40)}"><h4 title="${esc(z)}"><span class="zn">${esc(z)}</span><span class="mono">${zs.length}</span></h4><div class="zdots">${[...zs].sort(byState).map(cell).join('')}</div></div>`;
    }).join('')}</div></div>`;
  }).join('');
}
function plantMap(id, edit = false) {
  if (id === LOOSE) return zoneMap(looseAssets(), edit);
  const mp = mapById(id);
  if (!mp) return '';
  const on = onMap(id).map((a) => ({ a, k: machineState(a).k }));
  const pin = (x) => {
    const sel = edit && state.mapSel === x.a.id;
    const label = sel || state.mapLabels || !['run', 'idle', 'off'].includes(x.k);
    return `<button type="button" class="pin k-${x.k}${sel ? ' sel' : ''}" style="left:${(x.a.mapX * 100).toFixed(2)}%;top:${(x.a.mapY * 100).toFixed(2)}%" data-act="${edit ? 'map-pick' : 'open-asset'}" data-id="${esc(x.a.id)}" title="${esc(`${x.a.id} ${x.a.name} — ${MSTATE[x.k][0]}`)}" aria-label="${esc(`${x.a.id} ${x.a.name} ${MSTATE[x.k][0]}`)}">${label ? `<span class="pin-l">${esc(x.a.id)}</span>` : ''}</button>`;
  };
  // เครื่องที่ต้องดูแลวาดทีหลังสุดให้อยู่บนสุด
  const pins = [...on].sort((p, q) => MAP_ORDER.indexOf(q.k) - MAP_ORDER.indexOf(p.k)).map(pin).join('');
  return `<div class="fmapwrap"><div class="fmap${edit ? ' editing' : ''}" style="--ar:${mp.w || 4}/${mp.h || 3}" data-map="${esc(id)}">
      <img src="${mp.img}" alt="แผนผัง ${esc(mapName(mp))}" draggable="false"><div class="fmap-pins">${pins}</div></div></div>`;
}
function mapLegend(list) {
  const ks = list.map((a) => machineState(a).k);
  return `<ul class="mkey inline">${Object.entries(MSTATE).filter(([k]) => ks.includes(k) || ['stop', 'wait', 'run'].includes(k)).map(([k, [label]]) => `<li>${andon(k)}${label}<b class="mono">${ks.filter((x) => x === k).length}</b></li>`).join('')}</ul>`;
}

function viewPlant() {
  if (!state.assets.length && !state.maps.length) return '<p class="empty">ยังไม่มีเครื่องจักร นำเข้าทะเบียนเครื่องที่หน้าตั้งค่าก่อน</p>';
  const id = curMap();
  const mp = mapById(id);
  const edit = state.mapEdit && canAdmin() && !!mp;
  const list = mp ? onMap(id) : looseAssets();
  const name = mp ? mapName(mp) : 'เครื่องที่ยังไม่ได้วางบนแผนผัง';
  const tools = canAdmin() ? `<div class="u-row u-wrap">
      ${mp ? `<button type="button" class="btn ${edit ? 'solid' : ''}" data-act="map-edit">${edit ? 'เสร็จสิ้น' : 'จัดตำแหน่งเครื่อง'}</button>` : ''}
      ${!edit ? `<button type="button" class="btn" data-act="map-add">เพิ่มแผนผัง</button>` : ''}
      ${mp && !edit ? `<label class="btn">เปลี่ยนรูป<input type="file" id="map-file" accept="image/png,image/jpeg,image/webp,application/pdf" class="sr"></label>
        <button type="button" class="btn" data-act="map-export">ส่งออกตำแหน่ง CSV</button><button type="button" class="btn danger" data-act="map-del">ลบแผนผังนี้</button>` : ''}</div>` : '';
  const head = `<div class="u-spread">${plantTabs(id)}${tools}</div>`;
  const add = state.mapAdding && canAdmin() ? `<section class="box"><div class="bar"><h2>เพิ่มแผนผัง</h2></div><div class="pad">
      <div class="u-row u-wrap u-bottom"><div class="field"><label for="map-name">ชื่อแผนผัง (เช่น Fac A, Motor ชั้น 2)</label><input id="map-name" type="text" maxlength="40" value="${esc(state.mapNewName || '')}" autocomplete="off"></div>
      <label class="btn solid">เลือกรูปแผนผัง<input type="file" id="map-file-new" accept="image/png,image/jpeg,image/webp,application/pdf" class="sr"></label>
      <button type="button" class="btn" data-act="map-add">ยกเลิก</button></div>
      <p class="hint">ไฟล์ JPG, PNG, WebP หรือ PDF (ใช้หน้าแรก) ระบบย่อรูปให้ไม่เกินประมาณ 1 MB</p></div></section>` : '';
  if (state.mapBusy) return `${head}<section class="box"><p class="empty">กำลังเตรียมรูปแผนผัง…</p></section>`;
  if (!edit) {
    const status = mp
      ? `<p class="hint">${esc(name)}: ${list.length} เครื่อง สีของจุดตามสถานะเครื่อง กดที่จุดเพื่อเปิดดูเครื่อง <button type="button" class="link" data-act="map-labels">${state.mapLabels ? 'ซ่อนรหัสเครื่องที่ปกติ' : 'แสดงรหัสทุกเครื่อง'}</button></p>`
      : `<p class="hint">${list.length} เครื่องยังไม่ได้วางบนแผนผัง แสดงเป็นโซนตามไลน์และกระบวนการ${canAdmin() ? (state.maps.length ? ' เลือกแผนผังแล้วกด "จัดตำแหน่งเครื่อง" เพื่อวางจุด' : ' กด "เพิ่มแผนผัง" เพื่ออัปโหลดรูป Layout ของแต่ละโรงงาน') : ''}</p>`;
    return `${head}${add}
      <section class="box pg-plant" data-flow><div class="bar"><h2>${esc(name)}</h2>${mapLegend(list)}</div>
        <div class="pad">${status}${mp ? plantMap(id) : ''}</div>${mp ? '' : `<div class="pad">${zoneMap(list)}</div>`}</section>`;
  }
  // โหมดจัดตำแหน่ง: แผนผังซ้าย รายชื่อเครื่องขวา (เลือกได้ทุกเครื่อง กรองตามไลน์)
  const q = (state.mapQ || '').trim().toLowerCase();
  const lines = [...new Set(state.assets.map(lineOf))].sort();
  const fl = lines.includes(state.mapFilter) ? state.mapFilter : '';
  const rows = state.assets.filter((a) => (!fl || lineOf(a) === fl) && (!q || `${a.id} ${a.name} ${a.area || ''}`.toLowerCase().includes(q)))
    .sort((a, b) => Number(a.mapId === id && placed(a)) - Number(b.mapId === id && placed(b)) || Number(placed(a)) - Number(placed(b)) || a.id.localeCompare(b.id));
  const sel = assetOf(state.mapSel);
  const where = (a) => (placed(a) ? (a.mapId === id ? '<span class="ok-t" aria-label="วางบนแผนผังนี้แล้ว">✓</span>' : `<span class="dim small">${esc(mapName(mapById(a.mapId)))}</span>`) : '');
  return `${head}
    <div class="mapedit">
      <section class="box"><div class="bar"><h2>จัดตำแหน่งเครื่อง ${esc(name)}</h2><span class="dim">บนแผนผังนี้ ${list.length} เครื่อง</span></div>
        <div class="pad"><p class="hint">${sel ? `คลิกบนแผนผังตรงตำแหน่งของ <b class="mono">${esc(sel.id)}</b> ${esc(sel.name)}${placed(sel) && sel.mapId === id ? ' (ลากจุดเพื่อย้ายได้)' : placed(sel) ? ` (ตอนนี้อยู่บน ${esc(mapName(mapById(sel.mapId)))} คลิกเพื่อย้ายมาแผนผังนี้)` : ''}` : 'เลือกเครื่องจากรายการทางขวา แล้วคลิกบนแผนผังตรงตำแหน่งเครื่อง ลากจุดเพื่อย้าย'}</p>${plantMap(id, true)}</div></section>
      <section class="box mapside"><div class="bar"><h2>เลือกเครื่อง</h2></div>
        <div class="pad">
          <div class="field"><label class="sr" for="map-filter">กรองตามไลน์</label><select id="map-filter"><option value="">ทุกไลน์</option>${lines.map((l) => `<option ${l === fl ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
          <div class="wosearch"><span class="sicon">${icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>')}</span><label for="map-q" class="sr">ค้นหาเครื่อง</label><input id="map-q" type="search" placeholder="ค้นหารหัส ชื่อ กระบวนการ" value="${esc(state.mapQ || '')}" autocomplete="off"></div>
          ${sel && placed(sel) ? `<button type="button" class="btn small" data-act="map-unplace" data-id="${esc(sel.id)}">เอา ${esc(sel.id)} ออกจากแผนผัง</button>` : ''}
          <ul class="mlist">${rows.slice(0, 400).map((a) => `<li><button type="button" class="${state.mapSel === a.id ? 'sel' : ''}" data-act="map-pick" data-id="${esc(a.id)}"><span class="pm-dot k-${machineState(a).k}" aria-hidden="true"></span><span class="mono">${esc(a.id)}</span><span class="dim ml-n">${esc(a.name)}</span>${where(a)}</button></li>`).join('')}</ul>
          ${rows.length > 400 ? `<p class="hint">แสดง 400 จาก ${rows.length} เครื่อง ค้นหาหรือกรองเพื่อหาเครื่องอื่น</p>` : ''}
        </div></section>
    </div>`;
}

// แปลงไฟล์รูปหรือ PDF เป็นภาพ WebP ขนาดไม่เกิน ~1 MB เพื่อเก็บในเอกสาร Firestore ได้
async function floorImage(file) {
  let src;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('../vendor/pdfjs/pdf.min.js');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.js', import.meta.url).href;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const v0 = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, 3000 / Math.max(v0.width, v0.height)) });
    src = Object.assign(document.createElement('canvas'), { width: Math.round(viewport.width), height: Math.round(viewport.height) });
    const ctx = src.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, src.width, src.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  } else {
    if (!/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) throw new Error('รองรับไฟล์ JPG, PNG, WebP หรือ PDF');
    const url = URL.createObjectURL(file);
    try {
      src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('อ่านไฟล์ภาพไม่ได้')); im.src = url; });
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  const W0 = src.width || src.naturalWidth, H0 = src.height || src.naturalHeight;
  let side = Math.min(2400, Math.max(W0, H0));
  for (let i = 0; i < 8; i++) {
    const k = side / Math.max(W0, H0);
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(W0 * k), height: Math.round(H0 * k) });
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(src, 0, 0, c.width, c.height);
    for (const qv of [0.82, 0.7, 0.55]) {
      let img = c.toDataURL('image/webp', qv);
      if (!img.startsWith('data:image/webp')) img = c.toDataURL('image/jpeg', qv);
      if (img.length < 1000000) return { img, w: c.width, h: c.height };
    }
    side = Math.round(side * 0.8);
  }
  throw new Error('รูปแผนผังใหญ่เกินไป ลองลดขนาดหรือครอปรูปก่อนอัปโหลด');
}


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
    const who = x.w ? (x.w.tech ? esc(x.w.tech) : 'ยังไม่มีผู้รับผิดชอบ') : '';
    return `<button type="button" class="mtile s-${x.k}" ${act} aria-label="${esc(`${x.a.id} ${x.a.name} ${label}`)}">
      <span class="mt-top"><span class="u-row">${andon(x.k)}<span class="tag">${esc(x.a.id)}</span></span><span class="mt-state">${label}${x.since && x.k !== 'run' ? ` <span class="mono">${x.k === 'late' ? relDate(x.since) : ago(x.since)}</span>` : ''}</span></span>
      <span class="mt-name">${esc(x.a.name)}</span>
      ${detail ? `<span class="mt-detail">${detail}</span>` : ''}${who ? `<span class="mt-who">${who}</span>` : ''}
    </button>`;
  };
  // ใบงานตามขั้นตอน
  const open = state.workOrders.filter((w) => isOpen(w));
  const doneToday = state.workOrders.filter((w) => w.status === 'done' && w.endAt >= t0);
  const stage = (k, label, list, note) => {
    const old = [...list].sort((x, y) => x.startAt - y.startAt);
    return `<div class="stage">
      <h3>${label}</h3><p class="fig ${k === 'doing' && list.length ? '' : ''}">${list.length}</p>
      <p class="cap">${note(old)}</p>
      <ul>${old.slice(0, 3).map((w) => `<li><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.id)}</button><span>${esc(w.asset)}</span></li>`).join('')}</ul>
    </div>`;
  };
  const oldest = (l) => (l.length ? `ค้างนานสุด ${ago(l[0].startAt)}` : 'ไม่มีงานค้าง');
  const overdue = open.filter((w) => w.dueDate && w.dueDate < t0);
  const unassigned = open.filter((w) => w.status === 'open' && !w.tech);
  // PM
  const pmLate = state.pmPlans.filter((p) => p.dueDate < t0).sort((a, b) => a.dueDate - b.dueDate);
  const pmToday = state.pmPlans.filter((p) => p.dueDate >= t0 && p.dueDate < t0 + DAY);
  const pmWeek = state.pmPlans.filter((p) => p.dueDate >= t0 + DAY && p.dueDate <= t0 + 7 * DAY);
  const pmLater = state.pmPlans.length - pmLate.length - pmToday.length - pmWeek.length;
  const comp = pmCompliance(t0 - 29 * DAY);
  // อะไหล่
  const out = state.parts.filter((p) => partLevel(p) === 'out');
  const low = state.parts.filter((p) => partLevel(p) === 'low');
  const okParts = state.parts.filter((p) => partLevel(p) === 'ok').length;
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
  const activeN = state.assets.filter(inService).length;
  // เครื่องเยอะ (เช่น ทะเบียนทั้งโรงงาน) แสดงเฉพาะเครื่องที่ต้องดูแล ส่วนที่ปกติสรุปเป็นตัวเลขต่อไลน์
  const big = state.assets.length > 48 && !state.boardAll;
  const needsCare = (x) => !['run', 'idle', 'off'].includes(x.k);
  const lineBlock = (ln) => {
    const inLine = ms.filter((x) => (x.a.line || 'ไม่ระบุไลน์') === ln);
    const shown = big ? inLine.filter(needsCare) : inLine;
    const ok = inLine.filter((x) => x.k === 'run' || x.k === 'idle').length;
    // แผนผัง: ช่องละเครื่อง สีตามสถานะ เรียงเครื่องที่ต้องดูแลขึ้นก่อน
    const order = ['stop', 'wait', 'pm', 'late', 'idle', 'run', 'off'];
    const map = big ? `<div class="pmap" data-flow role="group" aria-label="แผนผังเครื่อง ${esc(ln)}">${[...inLine].sort((x, y) => order.indexOf(x.k) - order.indexOf(y.k) || String(x.a.name).localeCompare(String(y.a.name))).map((x) => `<button type="button" class="pm-cell k-${x.k}" data-act="open-asset" data-id="${esc(x.a.id)}" title="${esc(`${x.a.id} ${x.a.name} ${MSTATE[x.k][0]}`)}" aria-label="${esc(`${x.a.id} ${MSTATE[x.k][0]}`)}"></button>`).join('')}</div>` : '';
    return `<div class="mline" data-flow><h3>${esc(ln)} <span class="dim u-w400">${inLine.length} เครื่อง${big ? ` ปกติ ${ok}` : ''}</span></h3>${map}${shown.length ? `<div class="mgrid" data-flow>${shown.map(tile).join('')}</div>` : ''}</div>`;
  };

  // ทะเบียนใหญ่หรือมีรูปแผนผัง: แสดงแผนผังทีละโรงงาน เครื่องที่ต้องดูแลเป็นการ์ดด้านล่าง
  const useMap = !state.boardAll && (big || state.maps.length > 0);
  const plant = useMap ? curMap() : '';
  const careHere = useMap ? ms.filter((x) => (plant === LOOSE ? !placed(x.a) : x.a.mapId === plant && placed(x.a)) && needsCare(x)) : [];
  const useCount = Object.keys(USE).map((k) => ({ k: `use-${k}`, label: `${USE[k][0]} (${USE[k][1]})`, n: state.assets.filter((a) => useOf(a) === k).length }));
  const headline = stopN
    ? `<span class="alarm">เครื่องหยุดเสีย ${stopN} เครื่อง</span> จาก ${activeN} เครื่องที่ใช้งาน`
    : countM('wait') ? `<span class="warnt">รออะไหล่ ${countM('wait')} เครื่อง</span> เครื่องที่เหลือทำงานปกติ` : 'เครื่องจักรทุกเครื่องทำงานปกติ';
  const seeAll = (page, label) => `<button type="button" class="link" data-act="nav" data-id="${page}">${label}</button>`;

  // ---------- ตัวเลขสรุปและกราฟ ----------
  const monthStart = new Date(new Date(t0).getFullYear(), new Date(t0).getMonth(), 1).getTime();
  const doing = open.filter((w) => w.status === 'doing' || w.status === 'parts');
  const closedMonth = state.workOrders.filter((w) => w.status === 'done' && w.endAt >= monthStart);
  const closedTimed = closedMonth.filter(timed);
  const pmNext7 = state.pmPlans.filter((p) => p.dueDate <= t0 + 7 * DAY);
  const kpi = (k, label, value, sub, ic, act) => `<button type="button" class="kpi-card k-${k}" data-act="nav" data-id="${act}">
      <span class="kpi-ic" aria-hidden="true">${ic}</span>
      <span class="kpi-t"><span class="kpi-l">${label}</span><span class="kpi-vs"><span class="kpi-v mono">${value}</span><span class="kpi-s">${sub}</span></span></span></button>`;
  const I = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const kpis = `<section class="kpi-row" aria-label="ตัวเลขสรุป">
      ${kpi('asset', 'เครื่องจักรทั้งหมด', activeN.toLocaleString('th-TH'), `หยุดอยู่ ${stopN + countM('wait')} เครื่อง`, I('<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h10v2M7 12h4M7 15h7"/>'), 'assets')}
      ${kpi('open', 'ใบงานที่ยังไม่ปิด', open.length, `รออนุมัติ ${open.filter((w) => w.status === 'pending').length} ใบ`, I('<path d="M9 4h6l1 2h3v14H5V6h3z"/><path d="M9 12h6M9 16h4"/>'), 'work')}
      ${kpi('doing', 'กำลังซ่อม', doing.length, `ช่างกำลังทำงาน ${new Set(doing.map((w) => w.tech).filter(Boolean)).size} คน`, I('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'), 'work')}
      ${kpi('done', 'ปิดงานเดือนนี้', closedMonth.length, `เวลาซ่อมเฉลี่ย ${closedTimed.length ? hm(closedTimed.reduce((t, w) => t + (w.endAt - w.startAt), 0) / closedTimed.length) : '0:00'} ชม.`, I('<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'), 'work')}
      ${kpi('pm', 'PM ภายใน 7 วัน', pmNext7.length, `เลยกำหนดแล้ว ${pmLate.length} งาน`, I('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>'), 'pm')}
    </section>`;
  // ภาพรวมงานซ่อม: แท่ง = ใบแจ้งซ่อม (ไม่รวม PM) ต่อเดือน, เส้น = PM ที่ทำเสร็จ
  const yNow = new Date().getFullYear(); const mNow = new Date().getMonth();
  const series = TH_MON.slice(0, mNow + 1).map((label, mi) => {
    const inM = (t) => { if (!t) return false; const d = new Date(t); return d.getFullYear() === yNow && d.getMonth() === mi; };
    return { label, wo: liveWO().filter((w) => w.type !== 'pm' && inM(w.startAt)).length, pm: state.workOrders.filter((w) => w.type === 'pm' && w.status === 'done' && inM(w.endAt)).length };
  });
  const combo = (() => {
    const W = 640, H = 230, L = 32, R = 12, T = 18, B = 26;
    const max = Math.max(4, ...series.flatMap((x) => [x.wo, x.pm]));
    const top = Math.ceil(max / 4) * 4;
    const n = series.length; const bw = (W - L - R) / n;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const grid = [0, 1, 2, 3, 4].map((i) => { const v = (top / 4) * i; return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="cg"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="ct">${v}</text>`; }).join('');
    const bars = series.map((x, i) => `<g><title>${x.label}: ใบแจ้งซ่อม ${x.wo} ใบ PM เสร็จ ${x.pm} งาน</title><rect x="${L + i * bw + bw * 0.25}" y="${y(x.wo)}" width="${bw * 0.5}" height="${y(0) - y(x.wo)}" rx="3" class="cb"/>${x.wo ? `<text x="${L + i * bw + bw / 2}" y="${y(x.wo) - 4}" text-anchor="middle" class="cv">${x.wo}</text>` : ''}<text x="${L + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" class="ct${i === mNow ? ' on' : ''}">${x.label}</text></g>`).join('');
    const pts = series.map((x, i) => [L + i * bw + bw / 2, y(x.pm)]);
    const line = `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" class="cl"/>${pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="3.5" class="cd"><title>${series[i].label}: PM เสร็จ ${series[i].pm} งาน</title></circle>`).join('')}`;
    return `<svg viewBox="0 0 ${W} ${H}" class="combo" role="img" aria-label="ใบแจ้งซ่อมและ PM ที่ทำเสร็จรายเดือน ปี ${yNow + 543}">${grid}${bars}${line}</svg>`;
  })();
  // โดนัท: สัดส่วนตามกลุ่ม ตรงกลางคือยอดรวม
  const donut = (parts, total, label, aria) => {
    const C = 2 * Math.PI * 52; let acc = 0;
    const segs = parts.filter((x) => x.n).map((x) => { const len = (C * x.n) / Math.max(1, total); const seg = `<circle r="52" cx="70" cy="70" class="dn d-${x.k}" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-acc}"><title>${x.label} ${x.n}</title></circle>`; acc += len; return seg; }).join('');
    return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(aria)}"><circle r="52" cx="70" cy="70" class="dn-bg"/><g transform="rotate(-90 70 70)">${segs}</g><text x="70" y="68" text-anchor="middle" class="dn-n">${total.toLocaleString('th-TH')}</text><text x="70" y="88" text-anchor="middle" class="dn-l">${label}</text></svg>
      <ul class="dlist">${parts.map((x) => `<li><i class="d-${x.k}" aria-hidden="true"></i><span>${x.label}</span><b class="mono">${x.n.toLocaleString('th-TH')}</b><span class="dim mono">${total ? Math.round((100 * x.n) / total) : 0}%</span></li>`).join('')}</ul></div>`;
  };
  const woParts = [['pending', 'รออนุมัติ'], ['open', 'รอเริ่มงาน'], ['doing', 'กำลังซ่อม'], ['parts', 'รออะไหล่']].map(([k, label]) => ({ k: `w-${k}`, label, n: open.filter((w) => w.status === k).length }));
  woParts.push({ k: 'w-done', label: 'ปิดเดือนนี้', n: closedMonth.length });
  const woTotal = woParts.reduce((t, x) => t + x.n, 0);
  const healthParts = [['run', 'ปกติ'], ['late', 'PM เลยกำหนด'], ['pm', 'กำลังทำ PM'], ['wait', 'รออะไหล่'], ['stop', 'หยุดเสีย'], ['idle', 'สำรอง'], ['off', 'ไม่ได้ใช้งาน']].map(([k, label]) => ({ k: `h-${k}`, label, n: countM(k) })).filter((x) => x.n || ['run', 'stop', 'late'].includes(x.k.slice(2)));
  // หมวดเครื่อง
  const cats = new Map();
  state.assets.forEach((a) => { const c = a.category || a.line || 'ไม่ระบุหมวด'; const x = cats.get(c) || { n: 0, bad: 0 }; x.n++; if (needsCare(ms.find((y) => y.a.id === a.id) || {})) x.bad++; cats.set(c, x); });
  const catList = [...cats].sort((a, b) => b[1].n - a[1].n).slice(0, 7);
  // ใบงานล่าสุด
  const nList = 6;
  const recent = liveWO().sort((a, b) => b.startAt - a.startAt).slice(0, nList);
  const prioChip = (w) => { const [l, bg, fg] = PRIO[priOf(w)]; return `<span class="schip" style="background:${bg};color:${fg}">${l}</span>`; };
  // PM ที่จะถึง
  const upcoming = [...state.pmPlans].sort((a, b) => a.dueDate - b.dueDate).slice(0, nList);

  // แดชบอร์ดรวมภาพรวม: จอแรกคือตัวเลขสรุป ความพร้อมเครื่อง กราฟรายปีกับกราฟเวลาหยุด สัดส่วนสถานะ และใบงานที่เปิดอยู่
  const nOpen = fitOn() ? Math.max(2, Math.min(8, Math.floor((innerHeight - 730) / 52))) : 8;
  const o = overviewParts(m, nOpen);
  return `${kpis}
    ${o.reli.replace('<div class="cards4">', '<div class="cards4 dash-reli">')}

    <div class="bgrid dash-r3">
      <section class="box"><div class="bar"><h2>ภาพรวมงานซ่อม ปี ${yNow + 543}</h2><ul class="mkey inline"><li><i class="ck-b" aria-hidden="true"></i>ใบแจ้งซ่อม</li><li><i class="ck-l" aria-hidden="true"></i>PM ที่ทำเสร็จ</li></ul></div><div class="pad">${combo}</div></section>
      ${o.trend}
    </div>

    <div class="bgrid dash-r4">
      <section class="box"><div class="bar"><h2>สถานะใบงาน</h2>${seeAll('work', 'ดูทั้งหมด')}</div><div class="pad">${donut(woParts, woTotal, 'ใบงาน', 'สัดส่วนใบงานตามสถานะ')}</div></section>
      <section class="box"><div class="bar"><h2>สุขภาพเครื่องจักร</h2>${seeAll('assets', 'ดูทะเบียน')}</div><div class="pad">${donut(healthParts, state.assets.length, 'เครื่อง', 'สัดส่วนเครื่องตามสถานะ')}</div></section>
      ${o.open}
    </div>

    <div class="bgrid g3c">
      <section class="box"><div class="bar"><h2>PM ที่จะถึง</h2>${seeAll('pm', 'ดูแผน PM')}</div>
        ${upcoming.length ? `<ul class="alist">${upcoming.map((p) => `<li class="pick" data-act="nav" data-id="pm"><span class="tag">${esc(p.asset)}</span><span class="t">${esc(p.task)}<span class="s">${freqLabel(p.intervalDays)}</span></span><span class="u-nowrap mono ${p.dueDate < t0 ? 'alarm' : p.dueDate < t0 + DAY ? '' : 'dim'}">${p.dueDate < t0 + DAY && p.dueDate >= t0 ? 'วันนี้' : fmtDate(p.dueDate)}</span></li>`).join('')}</ul>` : '<p class="empty">ยังไม่มีแผน PM</p>'}
        <div class="pad goal"><p class="kpi">ทำ PM ทันกำหนด (30 วัน) <b class="mono">${comp.pct.toFixed(0)}%</b></p><div class="prog" role="img" aria-label="ทำ PM ทันกำหนด ${comp.pct.toFixed(0)} เปอร์เซ็นต์"><span style="width:${Math.min(100, comp.pct)}%"></span></div></div></section>
      <section class="box"><div class="bar"><h2>คลังอะไหล่ <span class="dim u-w400">ต้องสั่ง ${reorder.length}</span></h2>${seeAll('parts', 'ดูคลัง')}</div>
        ${state.parts.filter(tracked).length ? `<ul class="plist">${state.parts.filter(tracked).sort((a, b) => a.qty / Math.max(1, a.min) - b.qty / Math.max(1, b.min)).slice(0, nList).map((p) => { const r = p.qty / Math.max(1, p.max || p.min * 2 || 1); const lv = partLevel(p); return `<li><span class="t"><b>${esc(p.name)}</b><span class="dim mono">${esc(p.id)} คงเหลือ ${p.qty}${p.unit ? ` ${esc(p.unit)}` : ''}</span></span><span class="schip ${lv === 'ok' ? 's-ok' : 's-wait'}">${lv === 'out' ? 'หมด' : lv === 'low' ? 'ต่ำ' : 'ปกติ'}</span><span class="pbar2"><span class="l-${lv}" style="width:${Math.min(100, Math.max(3, 100 * r)).toFixed(0)}%"></span></span></li>`; }).join('')}</ul>` : '<p class="empty">ยังไม่มีอะไหล่</p>'}</section>
      <section class="box"><div class="bar"><h2>ทีมช่าง</h2><span class="dim u-small">ถืองาน / ปิด 7 วัน</span></div>
        ${team.length ? `<ul class="team">${team.slice(0, 7).map((t) => `<li>${avatar(t.name)}<span class="t"><b>${esc(t.name)}</b><span>${t.holding.length ? `${t.holding.length} งาน: ${t.holding.slice(0, 2).map((w) => esc(w.asset)).join(', ')}` : 'พร้อมรับงาน'}</span></span><span class="schip ${t.holding.length ? 's-info' : 's-ok'}">${t.holding.length ? 'กำลังทำงาน' : 'ว่าง'}</span><span class="mono dim">${t.closed}</span></li>`).join('')}</ul>` : '<p class="empty">ยังไม่มีข้อมูลช่างในระบบ</p>'}
        ${team.length > 7 ? `<p class="hint u-pad-b">และช่างอีก ${team.length - 7} คน (เรียงตามงานที่ถืออยู่)</p>` : ''}
        ${unassigned.length ? `<p class="hint u-pad-b">อนุมัติแล้วแต่ยังไม่มีผู้รับผิดชอบ ${unassigned.length} ใบ</p>` : ''}</section>
    </div>

    <section class="box dash-machines" data-flow>
      <div class="bar"><h2>แผนผังเครื่องจักร</h2>
        <ul class="mkey inline">${Object.entries(MSTATE).filter(([k]) => countM(k) || !['idle', 'off'].includes(k)).map(([k, [label]]) => `<li>${andon(k)}${label}<b class="mono">${countM(k)}</b></li>`).join('')}</ul></div>
      ${useMap ? `<div class="pad"><div class="u-spread">${plantTabs(plant)}<span class="u-row"><button type="button" class="link" data-act="nav" data-id="plant">เปิดหน้าแผนผังโรงงาน</button><button type="button" class="link" data-act="board-all">แสดงทุกเครื่องเป็นการ์ด</button></span></div>${plant === LOOSE ? '' : plantMap(plant)}</div>${plant === LOOSE ? `<div class="pad">${zoneMap(looseAssets())}</div>` : ''}
        ${careHere.length ? `<div class="pad" data-flow><h3>ต้องดูแล${plant === LOOSE ? '' : `ใน ${esc(mapName(mapById(plant)))}`} ${careHere.length} เครื่อง</h3><div class="mgrid" data-flow>${careHere.map(tile).join('')}</div></div>` : ''}`
    : `${state.assets.length > 48 || state.maps.length ? `<p class="hint u-pad-sm">แสดงทุกเครื่องเป็นการ์ด <button type="button" class="link" data-act="board-all">กลับไปแบบแผนผัง</button></p>` : ''}
      ${lines.map(lineBlock).join('') || '<p class="empty">ยังไม่มีเครื่องจักร</p>'}`}
    </section>

    ${o.timeline}

    <div class="bgrid g3c">
      <section class="box"><div class="bar"><h2>หมวดเครื่องจักร</h2>${seeAll('assets', 'ดูทะเบียน')}</div>
        ${catList.length ? `<ul class="clist">${catList.map(([c, x]) => `<li><span class="c-ic" aria-hidden="true">${esc([...c.replace(/^Machine\s+/i, '')][0] || '?')}</span><span class="t">${esc(c)}${x.bad ? `<span class="alarm u-small"> ต้องดูแล ${x.bad}</span>` : ''}</span><b class="mono">${x.n.toLocaleString('th-TH')}</b></li>`).join('')}</ul>` : '<p class="empty">ยังไม่มีเครื่องจักร</p>'}</section>
      <section class="box"><div class="bar"><h2>เครื่องมือวัด <span class="dim u-w400">ใช้ได้ ${gN('ok')} จาก ${state.gauges.length}</span></h2>${seeAll('gauges', 'ดูทะเบียน')}</div>
        ${gAlert.length ? `<ul class="alist">${gAlert.slice(0, 5).map((x) => `<li><span class="tag">${esc(x.g.id)}</span><span class="t">${esc(x.g.name)}</span><span class="u-nowrap ${x.s[0] === 'soon' ? 'dim' : 'alarm'}">${x.s[1]}</span></li>`).join('')}</ul>` : '<p class="empty">ทุกเครื่องมืออยู่ในรอบสอบเทียบ</p>'}</section>
      <section class="box"><div class="bar"><h2>ใบงานล่าสุด</h2>${seeAll('work', 'ดูทั้งหมด')}</div>
        ${recent.length ? `<div class="scroll"><table class="btable"><thead><tr><th scope="col">ใบงาน</th><th scope="col">เครื่อง</th><th scope="col">ความสำคัญ</th><th scope="col">สถานะ</th></tr></thead><tbody>
          ${recent.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}"><td class="bt-t"><b class="mono">${esc(w.id)}</b><small>${esc(w.title)}</small></td><td>${tag(w.asset)}</td><td>${prioChip(w)}</td><td>${statusChip(w.status)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">ยังไม่มีใบงาน</p>'}</section>
    </div>`;
}

/* ---------- SH-01 ภาพรวม ---------- */
// เทียบช่วงปัจจุบันกับช่วงก่อนหน้าเท่ากัน คืนข้อความและทิศ (ดีขึ้น/แย่ลง)
function delta(cur, prev, betterUp, unit = '%') {
  if (!isFinite(prev) || prev === 0 && cur === 0) return '<span class="chg flat">เท่าเดิม</span>';
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return '<span class="chg flat">เท่าเดิม</span>';
  const good = betterUp ? d > 0 : d < 0;
  const txt = unit === '%' ? `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}%` : `${d > 0 ? '+' : '−'}${hours(Math.abs(d))} ชม.`;
  return `<span class="chg ${good ? 'good' : 'bad'}">${txt}${icon(d > 0 ? '<path d="m7 14 5-5 5 5"/>' : '<path d="m7 10 5 5 5-5"/>')}</span>`;
}
function downtimeBuckets(range) {
  const t0 = startOfToday();
  const now = Date.now();
  const size = range === 90 ? 7 * DAY : DAY;
  const n = range === 90 ? 13 : range;
  return Array.from({ length: n }, (_, i) => {
    const b0 = t0 - (n - 1 - i) * size - (range === 90 ? 6 * DAY : 0);
    const b1 = Math.min(b0 + size, now);
    const down = state.assets.reduce((s, a) => s + mergedDown(a.id, b0, b1), 0);
    const fails = liveWO().filter((w) => w.type === 'breakdown' && w.startAt >= b0 && w.startAt < b0 + size).length;
    return { b0, b1, down, fails, label: range === 90 ? fmtDate(b0) : range === 7 ? fmtWd(b0) : String(new Date(b0).getDate()) };
  });
}

// ส่วนของภาพรวม (เดิมคือหน้า SH-01) ประกอบอยู่ในแดชบอร์ด: การ์ดความพร้อมเครื่อง กราฟเวลาหยุด ใบงานที่เปิดอยู่ ไทม์ไลน์ 7 วัน
function overviewParts(m, openLimit = Infinity) {
  const span = 7 * DAY;
  const pct = (t) => (((t - m.from) / span) * 100).toFixed(2);
  const days = Array.from({ length: 7 }, (_, i) => `<span>${fmtDate(m.from + i * DAY)}</span>`).join('');
  // ไทม์ไลน์แสดงเฉพาะเครื่องที่มีเหตุการณ์ใน 7 วัน หรือสถานะไม่ปกติ (เครื่องปกติสรุปเป็นจำนวน)
  const evOf = (a) => wosOf(a.id).filter((w) => w.status !== 'cancelled' && !(w.imported && !w.hasTime) && !['inspect', 'improve'].includes(w.type) && (w.endAt ?? m.now) >= m.from);
  const tlAssets = state.assets.filter((a) => evOf(a).length || !['run', 'idle', 'off'].includes(machineState(a).k));
  const quiet = state.assets.length - tlAssets.length;
  const rows = tlAssets.map((a) => {
    const spans = evOf(a)
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
  const t0 = startOfToday();
  const now = m.now;
  // ช่วง 7 วันก่อนหน้า สำหรับเปรียบเทียบ
  const pFrom = m.from - 7 * DAY, pTo = m.from;
  const prev = periodStats(pFrom, pTo).rows;
  const cur = periodStats(m.from, now).rows;
  const prevDown = prev.reduce((x, r) => x + r.down, 0);
  const prevAvail = prev.length ? prev.reduce((x, r) => x + r.avail, 0) / prev.length : 100;
  const byAvail = [...cur].sort((a, b) => b.avail - a.avail);
  const best = byAvail[0], worst = byAvail[byAvail.length - 1];
  // หยุดรายวัน 7 วัน
  const week = downtimeBuckets(7);
  const maxW = Math.max(1, ...week.map((b) => b.down));
  const peak = week.reduce((a, b) => (b.down > a.down ? b : a), week[0]);
  // PM 10 งานล่าสุด
  const pmDone = state.workOrders.filter((w) => w.type === 'pm' && w.status === 'done' && w.endAt).sort((a, b) => b.endAt - a.endAt).slice(0, 10).reverse();
  const onTime = pmDone.filter((w) => w.onTime !== false).length;
  // เครื่องหยุดนานสุด
  const rank = [...cur].filter((r) => r.down > 0).sort((a, b) => b.down - a.down).slice(0, 3);
  // กราฟหลัก
  // ช่วงเริ่มต้น: ถ้าข้อมูลย้อนหลังยังไม่ถึง 2 สัปดาห์ เปิดที่ 7 วัน จะได้ไม่เห็นแท่งว่างเกือบทั้งกราฟ
  const oldest = Math.min(now, ...state.workOrders.map((w) => w.startAt));
  const range = state.ovRange || (now - oldest > 14 * DAY ? 30 : 7);
  const bk = downtimeBuckets(range);
  const maxD = Math.max(1, ...bk.map((b) => b.down));
  const maxF = Math.max(1, ...bk.map((b) => b.fails));
  const selI = state.ovSel != null && state.ovSel < bk.length ? state.ovSel : bk.reduce((bi, b, i) => (b.down > bk[bi].down ? i : bi), 0);
  const sel = bk[selI];
  const avgDay = bk.reduce((x, b) => x + b.down, 0) / (range === 90 ? 91 : range);
  const pts = bk.map((b, i) => `${((i + 0.5) / bk.length) * 100},${100 - (b.fails / maxF) * 86}`).join(' ');
  const STAGE = { pending: 15, open: 35, doing: 65, parts: 65 };

  // งานจริงในระบบก่อนใบงานย้อนหลังที่นำเข้า แล้วเรียงตามความสำคัญ และงานที่แจ้งล่าสุดก่อน
  const openList = [...m.open].sort((a, b) => Number(!!a.imported) - Number(!!b.imported) || (PRANK[b.priority] ?? 0) - (PRANK[a.priority] ?? 0) || b.startAt - a.startAt);
  const openRows = openList.slice(0, openLimit).map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}">
      <td><span class="cellwo">${andon(machineState(state.assets.find((a) => a.id === w.asset) || { id: w.asset }).k)}<span class="t"><button type="button" class="link title" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.title)}</button><span class="sub"><span class="mono">${esc(w.id)}</span><span>${TYPE[w.type]}</span></span></span></span></td>
      <td>${w.asset ? tag(w.asset) : '<span class="dim">–</span>'}</td>
      <td>${w.tech ? `<span class="u-row">${avatar(w.tech.split(/,\s*/)[0])}<span class="u-nowrap">${esc(w.tech)}</span></span>` : '<span class="dim u-nowrap">ยังไม่มอบหมาย</span>'}</td>
      <td>${lamp(w.status)}</td>
      <td class="num mono" title="เปิดมาแล้ว">${ageText(now - w.startAt)}</td></tr>`).join('');

  return {
    reli: `<div class="cards4">
      <section class="card">
        <h2 class="clabel">Availability 7 วัน</h2>
        <p class="cfig">${m.avail.toFixed(1)}%${delta(m.avail, prevAvail, true)}</p>
        ${best ? `<div class="hl"><span class="hl-k">ดีที่สุด ${esc(best.a.id)}</span><span class="mono">${best.avail.toFixed(1)}%</span></div><div class="pbar big"><span style="width:${best.avail}%"></span></div>
        <div class="hl"><span class="hl-k">ต่ำที่สุด ${esc(worst.a.id)}</span><span class="mono">${worst.avail.toFixed(1)}%</span></div><div class="pbar big alt"><span style="width:${worst.avail}%"></span></div>` : ''}
      </section>
      <section class="card">
        <h2 class="clabel">เวลาหยุดเครื่องรวม</h2>
        <p class="cfig">${hours(m.down)} ชม.${delta(m.down, prevDown, false, 'h')}</p>
        <div class="hl"><span class="hl-k">รายวัน 7 วัน</span><span class="mono">สูงสุด ${hours(peak.down)} ชม.</span></div>
        <div class="minibars" role="img" aria-label="เวลาหยุดรายวัน 7 วัน สูงสุด ${hours(peak.down)} ชั่วโมงวันที่ ${fmtDate(peak.b0)}">${week.map((b) => `<span class="${b === peak && b.down ? 'on' : ''}" style="height:${Math.max(8, (b.down / maxW) * 100)}%"></span>`).join('')}</div>
      </section>
      <section class="card">
        <h2 class="clabel">PM ทันกำหนด</h2>
        <p class="cfig">${pmDone.length ? `${onTime} จาก ${pmDone.length} งาน` : 'ยังไม่มีข้อมูล'}</p>
        <div class="hl"><span class="hl-k">PM ที่ปิดล่าสุด</span><span class="mono">${pmDone.length ? `${Math.round((100 * onTime) / pmDone.length)}%` : ''}</span></div>
        <ol class="streak">${pmDone.map((w) => `<li class="${w.onTime !== false ? 'ok' : 'late'}" title="${esc(`${w.id} ${w.asset} ${fmtDate(w.endAt)} ${w.onTime !== false ? 'ทันกำหนด' : 'ช้ากว่ากำหนด'}`)}"><span class="d">${new Date(w.endAt).getDate()}</span>${w.onTime !== false ? icon('<path d="m5 12 5 5 9-10"/>') : icon('<path d="M7 7l10 10M17 7 7 17"/>')}</li>`).join('')}</ol>
      </section>
      <section class="card">
        <h2 class="clabel">เครื่องที่หยุดนานที่สุด (7 วัน)</h2>
        <p class="cfig">${rank.length ? `#1 ${esc(rank[0].a.id)}` : 'ไม่มีเครื่องหยุด'}</p>
        <ol class="rank">${rank.map((r) => `<li><button type="button" class="rk" data-act="open-asset" data-id="${esc(r.a.id)}">${andon(machineState(r.a).k)}<span class="nm">${esc(r.a.name)}</span><span class="mono">${hours(r.down)} ชม.</span></button></li>`).join('')}</ol>
      </section>
    </div>`,
    trend: `    <section class="card chart">
      <div class="chart-head">
        <div><h2>เวลาหยุดเครื่องและครั้งที่ขัดข้อง</h2><p class="clabel">เฉลี่ยต่อวัน</p><p class="cfig">${hours(avgDay)} ชม.</p><p class="sel-read"><b>${range === 90 ? `สัปดาห์ ${fmtDate(sel.b0)}` : fmtDate(sel.b0)}</b><span><i class="k-bar"></i>หยุด ${hours(sel.down)} ชม.</span><span><i class="k-line"></i>ขัดข้อง ${sel.fails} ครั้ง</span></p></div>
        <div class="chart-tools">
          <div class="seg-ctl" role="group" aria-label="ช่วงเวลา">${[[90, '90 วัน'], [30, '30 วัน'], [7, '7 วัน']].map(([v, l]) => `<button type="button" data-act="ov-range" data-id="${v}" aria-pressed="${range === v}">${l}</button>`).join('')}</div>
          <ul class="ckey"><li><i class="k-bar"></i>ชั่วโมงหยุด</li><li><i class="k-line"></i>ครั้งที่ขัดข้อง</li></ul>
        </div>
      </div>
      <div class="plot" style="--n:${bk.length}">
        <div class="bars">${bk.map((b, i) => `<button type="button" class="b ${i === selI ? 'sel' : ''}" data-act="ov-sel" data-id="${i}" aria-label="${esc(`${b.label}: หยุด ${hours(b.down)} ชั่วโมง ขัดข้อง ${b.fails} ครั้ง`)}" aria-pressed="${i === selI}"><span style="height:${Math.max(6, (b.down / maxD) * 100)}%"></span></button>`).join('')}</div>
        <svg class="line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>
        <div class="dots" aria-hidden="true">${bk.map((b, i) => `<i style="left:${((i + 0.5) / bk.length) * 100}%;top:${100 - (b.fails / maxF) * 86}%"></i>`).join('')}</div>
        <div class="tip" style="left:clamp(80px, ${((selI + 0.5) / bk.length) * 100}%, calc(100% - 80px))"><b>${range === 90 ? `สัปดาห์ ${fmtDate(sel.b0)}` : fmtDate(sel.b0)}</b><span><i class="k-bar"></i>หยุด ${hours(sel.down)} ชม.</span><span><i class="k-line"></i>ขัดข้อง ${sel.fails} ครั้ง</span></div>
      </div>
      <div class="xlab" style="--n:${bk.length}">${bk.map((b, i) => `<span class="${i === selI ? 'on' : ''}">${range === 30 && i % 3 && i !== selI ? '' : b.label}</span>`).join('')}</div>
    </section>`,
    open: `    <section class="card flush">
      <div class="bar"><h2>ใบสั่งงานที่เปิดอยู่ <span class="dim u-w400">${m.open.length} ใบ${openList.length > openLimit ? ` · แสดง ${Math.min(openLimit, openList.length)} ใบที่สำคัญและใหม่ที่สุด` : ''}</span></h2><button type="button" class="link" data-act="nav" data-id="work">ดูทั้งหมด</button></div>
      ${openRows ? `<div class="scroll"><table class="wotable dash-open"><thead><tr><th scope="col">ใบงาน</th><th scope="col">เครื่อง</th><th scope="col">ผู้รับผิดชอบ</th><th scope="col">สถานะ</th><th scope="col" class="num">เปิดมาแล้ว</th></tr></thead><tbody>${openRows}</tbody></table></div>` : '<p class="empty">ไม่มีงานค้าง</p>'}
    </section>`,
    timeline: `    <section class="card flush board">
      <div class="bar"><h2>สถานะเครื่อง 7 วัน</h2>
        <div class="legend"><span><i class="bar" style="--c:var(--run)"></i>เดินเครื่อง</span><span><i style="--c:var(--stop)"></i>หยุดเสีย</span><span><i style="--c:var(--wait)"></i>รออะไหล่</span><span><i style="--c:var(--card);--b:2px solid var(--pm)"></i>PM ตามแผน</span></div></div>
      <div class="scroll"><div class="tl">
        <div class="tl-row top"><span>เครื่อง</span><div class="tl-days">${days}</div><span class="num">หยุด (ชม.)</span></div>
        ${rows || `<p class="empty">${state.assets.length ? 'ไม่มีเหตุการณ์ในช่วง 7 วัน' : 'ยังไม่มีเครื่องจักร'}</p>`}
        ${rows && quiet ? `<p class="hint pad">เครื่องอื่นอีก ${quiet} เครื่องไม่มีเหตุการณ์ในช่วง 7 วัน</p>` : ''}
        <div class="tl-row foot"><span></span><span class="dim num tl-note">เส้นแนวตั้งแสดงเวลาปัจจุบัน ${fmtTime(m.now)}  MTBF ${hours(m.mtbf)} ชม.  MTTR ${hours(m.mttr)} ชม.</span><span class="tl-sum tl-total">${hours(m.down)}</span></div>
      </div></div>
    </section>`,
  };
}

/* ---------- SH-02 ใบสั่งงาน ---------- */
function formWorkOrder() {
  const d = state.draft;
  const opts = state.assets.map((a) => `<option value="${esc(a.id)}" ${d.asset === a.id ? 'selected' : ''}>${esc(a.id)} ${esc(a.name)}</option>`).join('');
  const pri = [['stop', 'เครื่องหยุด'], ['slow', 'ทำงานได้แต่ผิดปกติ'], ['plan', 'ดำเนินการตามแผนได้']];
  return `<form class="box" data-form="wo"><div class="bar"><h2>แจ้งซ่อมใหม่</h2></div>
    <div class="pad"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:var(--space-sm) var(--space-md)">
      <div class="field"><label for="f-asset">เครื่องจักร</label><select id="f-asset" name="asset" required>${opts}</select></div>
      <div class="field"><label for="f-pri">ผลกระทบ</label><select id="f-pri" name="priority">${pri.map(([v, l]) => `<option value="${v}" ${d.priority === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field full"><label for="f-title">อาการที่พบ</label><textarea id="f-title" name="title" rows="2" required>${esc(d.title)}</textarea></div>
    </div>
    <div class="actions"><button class="btn solid">ส่งแจ้งซ่อม</button><button type="button" class="btn" data-act="close-form">ยกเลิก</button></div></div></form>`;
}

// ยกเลิกใบงาน: แอดมินยกเลิกได้ทุกใบที่ยังไม่ปิด ผู้แจ้งยกเลิกใบของตัวเองได้ระหว่างรออนุมัติ
const canCancel = (w) => isOpen(w) && (canAdmin() || (w.status === 'pending' && !!w.requestedUid && w.requestedUid === state.user?.uid));

function cancelBox(w) {
  if (!canCancel(w)) return '';
  const c = state.cancelWo?.id === w.id ? state.cancelWo : null;
  if (!c) return `<div class="cancelrow"><button type="button" class="btn danger small" data-act="wo-cancel-open">ยกเลิกใบงานนี้</button><span class="hint">ใช้เมื่อสร้างผิดหรือซ้ำ</span></div>`;
  const used = w.partsUsed || [];
  return `<div class="cancelbox" role="group" aria-labelledby="w-cancel-l">
    <div class="field"><label id="w-cancel-l" for="w-cancel">เหตุผลที่ยกเลิก</label><textarea id="w-cancel" data-cancel rows="2" placeholder="เช่น สร้างซ้ำกับ WO-2611-001 หรือเลือกเครื่องผิด">${esc(c.reason)}</textarea></div>
    ${used.length ? `<p class="hint">อะไหล่ที่เบิกไว้ ${used.length} รายการจะคืนเข้าคลังให้อัตโนมัติ</p>` : ''}
    <p class="hint">ใบงานที่ยกเลิกยังเก็บไว้ในประวัติ แต่ไม่นับในสถิติ KPI และสถานะเครื่อง ยกเลิกแล้วแก้กลับไม่ได้</p>
    <div class="actions"><button type="button" class="btn danger" data-act="wo-cancel-go" ${c.reason.trim() ? '' : 'disabled'}>ยืนยันยกเลิกใบงาน</button><button type="button" class="btn" data-act="wo-cancel-close">ไม่ยกเลิก</button></div></div>`;
}

const partsValue = (used) => (used || []).reduce((t, u) => t + (Number(partOf(u.id)?.price) || 0) * u.qty, 0);

function woDetail(w) {
  const now = Date.now();
  const cancelled = w.status === 'cancelled';
  const done = w.status === 'done';
  const closed = done || cancelled;
  const st = (n, label, who, time, cls) => `<div class="step ${cls}"><span class="ball">${n}</span><span class="t"><b>${label}</b><span class="s">${esc(who)}</span><span class="m">${time}</span></span></div>`;
  const approved = !!w.approvedAt;
  const repairLabel = w.status === 'parts' ? 'รออะไหล่' : 'ซ่อม';
  const steps = [
    st(1, 'แจ้งซ่อม', w.requestedBy || '—', fmtDateTime(w.startAt), 'done'),
    st(2, 'อนุมัติ', w.approvedBy || (cancelled ? '—' : 'รอหัวหน้าแผนกอนุมัติ'), approved ? fmtDateTime(w.approvedAt) : '—', approved ? 'done' : cancelled ? '' : 'current'),
    st(3, repairLabel, w.tech || 'ยังไม่ได้มอบหมาย', approved ? TYPE[w.type] : '—', done ? 'done' : (approved && !cancelled ? 'current' : '')),
    cancelled ? st(4, 'ยกเลิก', w.cancelledBy || '—', fmtDateTime(w.endAt), 'cancel')
      : st(4, 'ปิดงาน', done ? (w.tech || '—') : 'รอผลการซ่อม', done ? fmtDateTime(w.endAt) : '—', done ? 'done' : '')
  ].join('');
  const a = assetOf(w.asset);
  const log = [...(w.log || [])].map((l, i) => ({ ...l, rev: REV[i] || i })).reverse();
  const used = w.partsUsed || [];
  const canIssue = !closed && approved && canTech();
  const partsBox = `<section class="box"><div class="bar"><h2>อะไหล่ที่เบิก</h2></div>
    ${used.length ? `<div class="scroll"><table style="min-width:420px"><thead><tr><th scope="col">รหัส</th><th scope="col">รายการ</th><th scope="col" class="num">จำนวน</th><th scope="col" class="num">มูลค่า (บาท)</th><th scope="col" class="num">คลังคงเหลือ</th></tr></thead><tbody>
      ${used.map((u) => { const p = partOf(u.id); return `<tr><td class="mono">${esc(u.id)}</td><td>${esc(p?.name || '—')}</td><td class="mono num">${u.qty}</td><td class="mono num">${Number(p?.price) > 0 ? baht(p.price * u.qty) : '—'}</td><td class="mono num ${p && needsOrder(p) ? 'alarm' : ''}">${p ? `${p.qty} / ${p.min}` : '—'}</td></tr>`; }).join('')}
    </tbody></table></div>${partsValue(used) ? `<p class="pad hint">มูลค่าอะไหล่ตามราคาในคลังรวม <b class="mono">${baht(partsValue(used))}</b> บาท</p>` : ''}` : '<p class="empty">ยังไม่มีการเบิกอะไหล่</p>'}
    ${canIssue ? `<form class="pad" data-form="issue" style="flex-direction:row;flex-wrap:wrap;align-items:flex-end;border-top:1px solid var(--line)">
      <div class="field" style="flex:1 1 220px;min-width:0"><label for="i-part">อะไหล่</label><select id="i-part" name="part" required class="u-fill">${state.parts.map((p) => `<option value="${esc(p.id)}" ${p.qty ? '' : 'disabled'}>${esc(p.id)} ${esc(p.name)} (คงเหลือ ${p.qty})</option>`).join('')}</select></div>
      <div class="field" style="flex:0 1 96px"><label for="i-qty">จำนวน</label><input id="i-qty" name="qty" type="number" min="1" value="1" required></div>
      <button class="btn">เบิกเข้าใบงาน</button></form>` : ''}</section>`;
  // ค่าใช้จ่าย: เลข PR ค่าซ่อม และรายละเอียด (ช่างบันทึกได้ระหว่างงาน แอดมินแก้ได้ทุกเวลา)
  const canCost = !cancelled && (canAdmin() || (canTech() && approved && !done));
  const costBox = `<section class="box"><div class="bar"><h2>ค่าใช้จ่าย</h2>${w.cost ? `<span class="mono">${baht(w.cost)} บาท</span>` : ''}</div>
    ${canCost ? `<div class="pad" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:var(--space-sm)">
      <div class="field"><label for="c-pr">เลขที่ PR</label><input id="c-pr" data-cost="prNo" value="${esc(w.prNo || '')}" placeholder="เช่น PR-2611-0042"></div>
      <div class="field"><label for="c-cost">ค่าใช้จ่าย (บาท)</label><input id="c-cost" data-cost="cost" type="number" min="0" step="0.01" inputmode="decimal" value="${w.cost ?? ''}"></div>
      <div class="field" style="grid-column:1/-1"><label for="c-note">รายละเอียดค่าใช้จ่าย</label><input id="c-note" data-cost="costNote" value="${esc(w.costNote || '')}" placeholder="เช่น ลูกปืน 2 ตัว ค่าแรงผู้รับเหมา"></div>
    </div><p class="hint u-pad-b">บันทึกอัตโนมัติเมื่อออกจากช่อง ค่าอะไหล่ในคลังไม่ต้องใส่ซ้ำ</p>`
    : `<dl class="kv pad"><dt>เลขที่ PR</dt><dd class="mono">${esc(w.prNo || '—')}</dd><dt>ค่าใช้จ่าย</dt><dd class="mono">${w.cost ? `${baht(w.cost)} บาท` : '—'}</dd><dt>รายละเอียด</dt><dd>${esc(w.costNote || '—')}</dd></dl>`}</section>`;
  let action = '';
  if (cancelled) {
    action = `<dl class="kv"><dt>ยกเลิกโดย</dt><dd>${esc(w.cancelledBy || '—')}</dd><dt>เวลา</dt><dd class="mono">${fmtDateTime(w.endAt)}</dd><dt>เหตุผล</dt><dd>${esc(w.cancelReason || '—')}</dd></dl>`;
  } else if (!done && w.status === 'pending') {
    action = canAdmin()
      ? `<div class="actions"><button type="button" class="btn solid" data-act="approve">อนุมัติและมอบหมาย</button></div><p class="hint">เมื่ออนุมัติแล้ว ใบงานจะเข้าสู่คิวงานของช่าง</p>`
      : '<p class="hint">รอหัวหน้าแผนกซ่อมบำรุงอนุมัติ</p>';
  } else if (!done && canTech()) {
    const c = state.close;
    const ready = c.cause && c.action.trim();
    action = `<div class="field"><label for="w-tech">ช่างผู้รับผิดชอบ</label><input id="w-tech" data-save="tech" value="${esc(w.tech)}"></div>
      <div class="field"><label for="w-cause">รหัสสาเหตุ</label><select id="w-cause" data-close="cause"><option value="">เลือกรหัสสาเหตุ</option>${CAUSES.map(([k, l]) => `<option value="${k}" ${c.cause === k ? 'selected' : ''}>${k} · ${l}</option>`).join('')}</select></div>
      <div class="field"><label for="w-action">การแก้ไขที่ต้นเหตุ</label><textarea id="w-action" data-close="action" rows="3" placeholder="เช่น เพิ่มรายการเปลี่ยนไส้กรองใน checklist กะ A">${esc(c.action)}</textarea></div>
      <div class="actions">
        <button type="button" class="btn" data-act="wo-set" data-id="doing" ${w.status === 'doing' ? 'disabled' : ''}>${w.status === 'parts' ? 'ดำเนินการซ่อมต่อ' : 'เริ่มซ่อม'}</button>
        <button type="button" class="btn" data-act="wo-set" data-id="parts" ${w.status === 'parts' ? 'disabled' : ''}>รออะไหล่</button>
        <button type="button" class="btn solid" data-act="wo-close" ${ready ? '' : 'disabled'}>ปิดงาน</button>
      </div>
      <p class="hint">${ready ? 'เมื่อปิดงาน ระบบจะบันทึกเวลาและเพิ่มลงในประวัติเครื่องจักร' : 'กรุณาเลือกรหัสสาเหตุและระบุการแก้ไขที่ต้นเหตุก่อนปิดงาน'}</p>`;
  } else if (done) {
    action = `<dl class="kv"><dt>รหัสสาเหตุ</dt><dd class="mono">${esc(w.cause || '—')}</dd><dt>การแก้ไข</dt><dd>${esc(w.action || '—')}</dd>${w.imported && !w.hasTime ? '' : `<dt>เวลาหยุดรวม</dt><dd class="mono">${hm(w.endAt - w.startAt)} ชม.</dd>`}</dl>${w.imported && !w.hasTime ? '<p class="hint">ใบงานย้อนหลังจาก Job Request list ไม่มีข้อมูลเวลาหยุดเครื่อง จึงไม่นับใน Availability และ MTTR</p>' : ''}`;
  } else {
    action = canCancel(w) ? '' : '<p class="hint">บัญชีนี้มีสิทธิ์ดูข้อมูลเท่านั้น</p>';
  }
  action += cancelBox(w);
  return `<section class="stack" aria-label="รายละเอียดใบสั่งงาน">
    <div class="head" style="border:0;padding:0"><div><span class="doc"><span class="mono">${esc(w.id)}</span><span>${esc(w.condition || TYPE[w.type])}</span></span><h2 style="font-size:var(--text-xl);line-height:1.35">${esc(w.title)}</h2></div>
      ${lamp(w.status)}</div>
    <div class="steps">${steps}</div>
    <div class="split">
      <div class="w3">
        <section class="box"><div class="bar"><h2>ข้อมูลงาน</h2></div>
          <dl class="facts">
            <div><dt>เครื่อง</dt><dd>${a ? `<button type="button" class="link" data-act="open-asset" data-id="${esc(w.asset)}">${esc(w.asset)}</button> ${esc(a.name)}` : `${w.asset ? `<span class="mono">${esc(w.asset)}</span> ` : ''}${esc(w.assetName || (w.asset ? 'ไม่อยู่ในทะเบียนปัจจุบัน' : '—'))}`}</dd></div>
            <div><dt>ตำแหน่ง</dt><dd>${esc(a?.line || '—')}</dd></div>
            <div><dt>ระดับเครื่อง</dt><dd>${esc(a?.cls || '—')}</dd></div>
            ${w.imported && !w.hasTime ? `<div><dt>ใช้เวลาดำเนินการ</dt><dd class="mono">${w.endAt ? `${Math.round((w.endAt - w.startAt) / DAY)} วัน` : `${Math.floor((now - w.startAt) / DAY)} วันแล้ว`}</dd></div>
            <div><dt>ประเภทตาม Job Request</dt><dd>${esc(w.condition || '—')}</dd></div>${w.process ? `<div><dt>กระบวนการ</dt><dd>${esc(w.process)}</dd></div>` : ''}${w.section ? `<div><dt>แผนก</dt><dd>${esc(w.section)}</dd></div>` : ''}`
              : `<div><dt>เครื่องหยุด</dt><dd class="mono">${w.type === 'inspect' || w.type === 'improve' ? 'ไม่หยุด' : `${hm((w.endAt ?? now) - w.startAt)} ชม.`}</dd></div>`}
            ${w.dueDate ? `<div><dt>กำหนดเสร็จ</dt><dd class="mono ${!done && w.dueDate < startOfToday() ? 'alarm' : ''}">${fmtDateY(w.dueDate)}</dd></div>` : ''}
            ${(w.team || []).length > 1 ? `<div><dt>ทีม</dt><dd>${w.team.map(esc).join(', ')}</dd></div>` : ''}
          </dl>
          ${w.note ? `<div class="pad" style="gap:var(--space-2xs)"><span class="hint">รายละเอียด</span><p class="u-pre">${esc(w.note)}</p></div>` : ''}
          ${w.photo ? `<div class="pad" style="gap:var(--space-2xs)"><span class="hint">ภาพถ่ายจากผู้แจ้ง</span><img src="${esc(w.photo)}" alt="ภาพอาการที่ผู้แจ้งถ่ายไว้" style="max-width:100%;border-radius:var(--radius-card);border:1px solid var(--line)"></div>` : ''}</section>
        ${(w.checks || []).length ? `<section class="box"><div class="bar"><h2>รายการตรวจ</h2><span class="mono dim">${w.checks.filter((c) => c.done).length} / ${w.checks.length}</span></div>
          ${w.checks.map((c, i) => `<label class="list-row" style="grid-template-columns:22px minmax(0,1fr);align-items:center;cursor:${!closed && canTech() && approved ? 'pointer' : 'default'}"><input type="checkbox" data-check="${i}" ${c.done ? 'checked' : ''} ${!closed && canTech() && approved ? '' : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent)"><span style="${c.done ? 'color:var(--muted);text-decoration:line-through' : ''}">${esc(c.text)}</span></label>`).join('')}
          ${!done && !approved ? '<p class="hint u-pad-b">บันทึกผลได้หลังหัวหน้าแผนกอนุมัติ</p>' : ''}</section>` : ''}
        <section class="box graphite revlog"><div class="bar"><h2>บันทึกการเปลี่ยนแปลง</h2></div>
          <table><thead><tr><th scope="col" style="width:48px">REV</th><th scope="col" style="width:140px">เวลา</th><th scope="col">รายการ</th></tr></thead>
          <tbody>${log.map((l) => `<tr><td class="mono">${l.rev}</td><td class="mono u-nowrap">${fmtDateTime(l.at)}</td><td>${esc(l.text)}</td></tr>`).join('')}</tbody></table></section>
        ${partsBox}
        ${costBox}
      </div>
      <section class="box w2" style="gap:0;border-width:1.5px"><div class="bar"><h2>${cancelled ? 'ใบงานถูกยกเลิก' : done ? 'ผลการปิดงาน' : 'บันทึกผลและปิดงาน'}</h2></div><div class="pad">${action}</div></section>
    </div></section>`;
}

// ซ่อนใบงานที่ยกเลิก (ค่าเริ่มต้น) จำไว้ในเบราว์เซอร์ ถ้าเลือกตัวกรองสถานะ "ยกเลิก" จะแสดงเสมอ
function loadPref(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
function savePref(k, v) { try { localStorage.setItem(k, v); } catch { /* ไม่มีที่เก็บก็ใช้ค่าในหน่วยความจำ */ } }
function loadHideCancelled() { try { return localStorage.getItem('cmms.hideCancelled') !== 'off'; } catch { return true; } }
const cancelShown = (w) => w.status !== 'cancelled' || !state.hideCancelled || state.woStatus === 'cancelled';

function scopeList() {
  const me = state.user.name;
  return state.scope === 'mine' ? state.workOrders.filter((w) => w.tech === me || w.requestedBy === me) : state.workOrders;
}

function taskRow(w) {
  const done = !isOpen(w);
  const [c, tb, tf] = TYPE_STYLE[w.type] || TYPE_STYLE.inspect;
  const [pl, pb, pf] = PRIO[priOf(w)];
  const sub = `<span class="mono">${esc(w.id)}</span><span>${w.status === 'done' ? 'ปิดแล้ว' : STATUS[w.status][0]}</span>`;
  return `<div class="trow task ${done ? 'done' : ''}" data-act="open-wo" data-id="${esc(w.id)}"${w.id === state.selectedWo ? ' aria-current="true"' : ''}>
    <span class="stripe" style="--c:${c}"></span>
    <span><button type="button" class="check ${done ? 'on' : ''}" data-act="open-wo" data-id="${esc(w.id)}" aria-label="เปิดใบงาน ${esc(w.id)}${done ? ' (ปิดแล้ว)' : ''}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></button></span>
    <span class="tname"><button type="button" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.title)}</button><small>${sub}</small></span>
    <span class="cell">${pill(TYPE[w.type], 'var(--grey-bg)', done ? 'var(--muted)' : 'var(--grey-fg)')}</span>
    <span class="cell"><span class="tag">${esc(w.asset)}</span></span>
    <span class="cell">${w.tech ? `${avatar(w.tech)}<span class="u-ell">${esc(w.tech)}</span>` : '<span class="dim">ยังไม่ได้มอบหมาย</span>'}</span>
    <span class="cell mono" style="font-size:var(--text-sm)">${relDate(done ? w.endAt : w.startAt)}</span>
    <span class="cell">${done ? pill(pl, 'var(--grey-bg)', 'var(--muted)') : pill(pl, pb, pf)}</span>
  </div>`;
}

function quickAdd() {
  if (!state.user.role) return '';
  if (!state.quick) return `<button type="button" class="addrow" data-act="quick-open"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>เพิ่มงาน</button>`;
  const d = state.draft;
  return `<form class="quick" data-form="quick">
    <label for="qa-title" class="sr">ชื่องาน</label><input id="qa-title" name="title" placeholder="ระบุอาการหรือชื่องาน แล้วกด Enter" value="${esc(d.title)}" required autocomplete="off">
    <label for="qa-asset" class="sr">เครื่องจักร</label><select id="qa-asset" name="asset" required>${state.assets.map((a) => `<option value="${esc(a.id)}" ${d.asset === a.id ? 'selected' : ''}>${esc(a.id)} ${esc(a.name)}</option>`).join('')}</select>
    <label for="qa-pri" class="sr">ผลกระทบ</label><select id="qa-pri" name="priority" style="flex-basis:150px">${Object.entries({ stop: 'เครื่องหยุด', slow: 'ทำงานได้แต่ผิดปกติ', plan: 'ดำเนินการตามแผนได้' }).map(([k, l]) => `<option value="${k}" ${(d.priority || 'stop') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="btn solid small">เพิ่ม</button><button type="button" class="btn small" data-act="quick-cancel">ยกเลิก</button>
  </form>`;
}

/* ---------- SH-02 ใบงาน: ตารางเต็มความกว้าง ตัวกรอง ค้นหา แถวขยายดูรายละเอียด แบ่งหน้า ---------- */
const WO_PER_PAGE = 15;
const WO_CHIP = { pending: 'pend', open: 'info', doing: 'ok', parts: 'wait', done: 'grey', cancelled: 'off' };
const WO_STATUS_FILTER = [['all', 'ทั้งหมด'], ['active', 'งานที่เปิดอยู่'], ['pending', 'รออนุมัติ'], ['open', 'รอเริ่มงาน'], ['doing', 'กำลังซ่อม'], ['parts', 'รออะไหล่'], ['done', 'ปิดงานแล้ว'], ['cancelled', 'ยกเลิก']];
const chevronSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const statusChip = (s) => `<span class="schip s-${WO_CHIP[s] || 'grey'}">${esc(STATUS[s]?.[0] || s)}</span>`;

function woFiltered() {
  const t = state.woQ.trim().toLowerCase();
  const f = state.woStatus;
  return scopeList()
    .filter(cancelShown)
    .filter((w) => (f === 'all' ? true : f === 'active' ? isOpen(w) : w.status === f))
    .filter((w) => !t || `${w.id} ${w.title} ${w.asset} ${assetOf(w.asset)?.name || ''} ${w.tech || ''} ${w.requestedBy || ''}`.toLowerCase().includes(t))
    .sort((a, b) => (!isOpen(a)) - (!isOpen(b)) || b.startAt - a.startAt);
}

function woRow(w) {
  const done = !isOpen(w);
  const a = assetOf(w.asset);
  const ms = a ? machineState(a) : null;
  const p = priOf(w);
  const open = !!state.woOpen[w.id];
  const rid = `wox-${esc(w.id)}`;
  const main = `<tr class="worow${open ? ' open' : ''}${done ? ' done' : ''}"${w.id === state.selectedWo ? ' aria-current="true"' : ''}>
    <td class="xcol"><button type="button" class="xbtn" data-act="wo-expand" data-id="${esc(w.id)}" aria-expanded="${open}" aria-controls="${rid}" aria-label="${open ? 'ซ่อน' : 'แสดง'}รายละเอียดใบงาน ${esc(w.id)}">${chevronSvg}</button></td>
    <td>${statusChip(w.status)}</td>
    <td class="two"><button type="button" class="tlink" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.title)}</button><small><span class="mono">${esc(w.id)}</span> ${esc(w.condition || TYPE[w.type] || '')}</small></td>
    <td class="two"><span class="mrow">${ms ? andon(ms.k) : ''}<span><b class="mono">${esc(w.asset || '—')}</b><small>${esc(a ? `${a.name}${a.line ? `  ${a.line}` : ''}` : w.assetName || 'ไม่พบข้อมูลเครื่อง')}</small></span></span></td>
    <td><span class="prio p-${done ? 'done' : p}">${esc(PRIO[p][0])}</span></td>
    <td class="two">${w.tech ? `<span class="mrow">${avatar(w.tech)}<span><b>${esc(w.tech)}</b><small>มอบหมายแล้ว</small></span></span>` : '<span class="dim">รอมอบหมาย</span>'}</td>
    <td class="two"><b class="mono">${fmtDateY(w.startAt)}</b><small class="mono">${fmtTime(w.startAt)}</small></td>
    <td class="num"><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}" aria-label="เปิดใบงาน ${esc(w.id)}">รายละเอียด</button></td>
  </tr>`;
  if (!open) return main;
  const late = !done && w.dueDate && w.dueDate < startOfToday();
  const facts = [
    ['ผู้แจ้ง', w.requestedBy || '—'],
    ['ผู้อนุมัติ', w.approvedBy || '—'],
    ['กำหนดเสร็จ', w.dueDate ? fmtDateY(w.dueDate) : 'ไม่ได้กำหนด', late ? 'alarm' : ''],
    [w.status === 'cancelled' ? 'ยกเลิกเมื่อ' : done ? 'ปิดงาน' : 'เวลาที่ผ่านไป', done ? (w.endAt ? fmtDateTime(w.endAt) : '—') : `${hm(Date.now() - w.startAt)} ชม.`],
    ...(w.status === 'cancelled' ? [['เหตุผลที่ยกเลิก', `${w.cancelReason || '—'}${w.cancelledBy ? ` (${w.cancelledBy})` : ''}`]] : [])
  ].map(([k, v, c]) => `<div><dt>${k}</dt><dd class="${c || ''}">${esc(v)}</dd></div>`).join('');
  const rca = done && (w.cause || w.action) ? `<div class="wide"><dt>สาเหตุและการแก้ไข</dt><dd>${esc([w.cause, w.action].filter(Boolean).join('  '))}</dd></div>` : '';
  return `${main}<tr class="woexp" id="${rid}"><td></td><td colspan="7">
    <div class="band"><dl>${facts}${w.note ? `<div class="wide"><dt>รายละเอียด</dt><dd class="u-pre">${esc(w.note)}</dd></div>` : ''}${rca}</dl>
      <span class="bandbtns"><button type="button" class="btn small" data-act="open-wo" data-id="${esc(w.id)}">เปิดใบงาน</button>${canCancel(w) ? `<button type="button" class="btn small danger" data-act="wo-cancel-row" data-id="${esc(w.id)}">ยกเลิกใบงาน</button>` : ''}</span></div>
  </td></tr>`;
}

function woTable() {
  const rows = woFiltered();
  const per = fitOn() ? (state.fitRows.work || 12) : WO_PER_PAGE;
  const pages = Math.max(1, Math.ceil(rows.length / per));
  state.woPage = Math.min(state.woPage, pages - 1);
  const from = state.woPage * per;
  const shown = rows.slice(from, from + per);
  if (!rows.length) {
    const hid = state.hideCancelled ? scopeList().filter((w) => w.status === 'cancelled').length : 0;
    return `<p class="empty">${state.woQ.trim() ? 'ไม่พบใบงานที่ตรงกับคำค้น' : 'ไม่มีใบงานในเงื่อนไขนี้'}${hid ? ` (ซ่อนงานที่ยกเลิกไว้ ${hid} ใบ)` : ''}</p>`;
  }
  return `<div class="scroll"><table class="wot">
      <thead><tr><th scope="col" class="xcol"><span class="sr">ขยาย</span></th><th scope="col">สถานะ</th><th scope="col">ใบงาน</th><th scope="col">เครื่องจักร</th><th scope="col">ความสำคัญ</th><th scope="col">ผู้รับผิดชอบ</th><th scope="col">วันที่แจ้ง</th><th scope="col"><span class="sr">ลิงก์</span></th></tr></thead>
      <tbody>${shown.map(woRow).join('')}</tbody></table></div>
    ${pages < 2 ? '' : `<nav class="pager" aria-label="เลขหน้าใบงาน"><span class="mono">${from + 1}–${from + shown.length} จาก ${rows.length}</span>
      <button type="button" class="pbtn" data-act="wo-page" data-id="prev" ${state.woPage === 0 ? 'disabled' : ''} aria-label="หน้าก่อนหน้า"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
      <button type="button" class="pbtn" data-act="wo-page" data-id="next" ${state.woPage >= pages - 1 ? 'disabled' : ''} aria-label="หน้าถัดไป"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></nav>`}`;
}

function woGroups() {
  const list = scopeList().filter(cancelShown);
  const groups = [
    ['pending', 'รออนุมัติ', (w) => w.status === 'pending'],
    ['active', 'กำลังดำเนินการ', (w) => ['open', 'doing', 'parts'].includes(w.status)],
    ['done', state.hideCancelled ? 'ปิดแล้ว' : 'ปิดแล้ว / ยกเลิก', (w) => !isOpen(w)]
  ];
  const body = groups.map(([k, label, test]) => {
    const items = list.filter(test);
    const open = !state.collapsed[k];
    const shown = k === 'done' && !state.showDone ? items.slice(0, 6) : items;
    return `<section aria-label="${label}">
      <button type="button" class="ghead" data-act="toggle-group" data-id="${k}" aria-expanded="${open}">${chevronSvg}${label}<span class="mono">${items.length}</span></button>
      ${open ? `${shown.map(taskRow).join('')}${!items.length && k !== 'pending' ? '<p class="empty" style="padding-left:var(--space-lg)">ไม่มีงานในกลุ่มนี้</p>' : ''}
        ${k === 'done' && items.length > shown.length ? `<button type="button" class="more" data-act="show-done">แสดงเพิ่มเติม ${items.length - shown.length} งาน</button>` : ''}
        ${k === 'pending' ? quickAdd() : ''}` : ''}
    </section>`;
  }).join('');
  return `<div class="tasks"><div class="scroll"><div class="grid">
      <div class="trow th"><span></span><span></span><span class="u-px">ชื่องาน</span><span class="u-px">ประเภท</span><span class="u-px">เครื่อง</span><span class="u-px">ผู้รับผิดชอบ</span><span class="u-px">วันที่</span><span class="u-px">ความสำคัญ</span></div>
      ${body}
    </div></div></div>`;
}

function viewWork() {
  const all = state.workOrders;
  const me = state.user.name;
  const mineCount = all.filter((w) => (w.tech === me || w.requestedBy === me) && isOpen(w)).length;
  const scopeBtns = [['all', 'งานทั้งหมด', all.filter((w) => isOpen(w)).length], ['mine', 'งานของฉัน', mineCount]]
    .map(([k, l, n]) => `<button type="button" data-act="scope" data-id="${k}" aria-pressed="${state.scope === k}">${l}<span class="mono">${n}</span></button>`).join('');
  const views = [['table', 'มุมมองตาราง', '<path d="M4 6h16M4 12h16M4 18h16"/>'], ['group', 'มุมมองแยกตามสถานะ', '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>']]
    .map(([k, l, d]) => `<button type="button" data-act="wo-view" data-id="${k}" aria-pressed="${state.woView === k}" aria-label="${l}" title="${l}">${icon(d)}</button>`).join('');
  const fLabel = WO_STATUS_FILTER.find(([k]) => k === state.woStatus)?.[1] || '';
  const pop = state.woFilter ? `<div class="wopop" role="group" aria-label="กรองตามสถานะ"><p class="hint">สถานะใบงาน</p>
      ${WO_STATUS_FILTER.map(([k, l]) => `<button type="button" data-act="wo-status" data-id="${k}" aria-pressed="${state.woStatus === k}">${l}<span class="mono">${k === 'all' ? scopeList().filter(cancelShown).length : k === 'active' ? scopeList().filter((w) => isOpen(w)).length : scopeList().filter((w) => w.status === k).length}</span></button>`).join('')}</div>` : '';
  const table = state.woView === 'table';
  const nCancel = scopeList().filter((w) => w.status === 'cancelled').length;
  return `<div class="wobar">
      <div class="seg-ctl wv" role="group" aria-label="รูปแบบการแสดงผล">${views}</div>
      <div class="chips" role="group" aria-label="ขอบเขตงาน">${scopeBtns}</div>
      ${table ? `<div class="wofilter"><button type="button" class="btn" data-act="wo-filter" aria-expanded="${state.woFilter}">${icon('<path d="M4 6h16M7 12h10M10 18h4"/>')}ตัวกรอง<span class="fval">${esc(fLabel)}</span></button>${pop}</div>
      <div class="wosearch"><span class="sicon">${icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>')}</span><label for="wo-q" class="sr">ค้นหาใบงาน</label><input id="wo-q" type="search" autocomplete="off" placeholder="ค้นหาเลขที่ ชื่องาน หรือเครื่องจักร" value="${esc(state.woQ)}"></div>` : '<span class="u-grow"></span>'}
      ${nCancel ? `<button type="button" class="btn" data-act="wo-hide-cancel" aria-pressed="${!state.hideCancelled}">${state.hideCancelled ? `แสดงงานที่ยกเลิก <span class="mono dim">${nCancel}</span>` : 'ซ่อนงานที่ยกเลิก'}</button>` : ''}
      <button type="button" class="btn" data-act="export-wo">ส่งออก CSV</button>
    </div>
    ${table ? `<section class="card flush wocard" aria-label="รายการใบงาน"><div id="wo-body">${woTable()}</div></section>` : woGroups()}`;
}

/* ---------- SH-00 แจ้งซ่อมด่วน (ฝ่ายผลิต ใช้บนมือถือ) ---------- */
const SYMPTOMS = ['หยุดทำงาน', 'หยิบชิ้นงานผิดพลาด', 'เสียงผิดปกติ', 'ของเสียเพิ่มขึ้นผิดปกติ', 'อุณหภูมิสูงผิดปกติ', 'มีการรั่วซึม', 'แสดงข้อความแจ้งเตือน (Error)'];
function freshQr() {
  return { asset: '', symptoms: [], stopped: null, note: '', photo: null, sent: null, filter: '' };
}
function viewQuick() {
  const q = state.qr || (state.qr = freshQr());
  if (q.sent) {
    const w = state.workOrders.find((x) => x.id === q.sent.id);
    return `<section class="qr done" aria-live="polite">
      <span class="okmark"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></span>
      <div><h2 style="font-size:var(--text-2xl);line-height:1.35">ส่งใบแจ้งซ่อมเรียบร้อยแล้ว</h2><span class="mono dim">${esc(q.sent.id)}</span></div>
      <dl class="kv box" style="padding:var(--space-md);border-radius:var(--radius-card)"><dt>เครื่อง</dt><dd class="mono">${esc(q.sent.asset)}</dd><dt>อาการ</dt><dd>${esc(q.sent.title)}</dd><dt>สถานะ</dt><dd>${w ? STATUS[w.status][0] : 'รออนุมัติ'}</dd></dl>
      <p class="dim">${q.sent.stopped ? 'ระบบแจ้งหัวหน้าแผนกซ่อมบำรุงแล้ว หากไม่มีช่างเข้ารับงานภายใน 15 นาที กรุณาติดต่อแผนกซ่อมบำรุงทางโทรศัพท์' : 'ช่างจะเข้าตรวจสอบภายในกะปัจจุบัน ติดตามสถานะได้ที่หน้างานซ่อม'}</p>
      <div class="actions"><button type="button" class="btn solid big" data-act="qr-again">แจ้งซ่อมรายการใหม่</button><button type="button" class="btn big" data-act="open-wo" data-id="${esc(q.sent.id)}">ดูใบงาน</button></div>
    </section>`;
  }
  const t = q.filter.trim().toLowerCase();
  const list = state.assets.filter((a) => !t || `${a.id} ${a.name} ${a.line}`.toLowerCase().includes(t));
  const ready = q.asset && q.symptoms.length && q.stopped !== null;
  const missing = !q.asset ? 'กรุณาเลือกเครื่องจักร' : !q.symptoms.length ? 'กรุณาระบุอาการอย่างน้อย 1 รายการ' : q.stopped === null ? 'กรุณาระบุสถานะเครื่องจักร' : '';
  return `<form class="qr" data-form="qr">
    <p class="hint" style="margin:calc(-1 * var(--space-xs)) 0 0">กรอกข้อมูล 3 ขั้นตอน ระบบจะส่งใบแจ้งซ่อมให้หัวหน้าแผนกซ่อมบำรุงพิจารณาอนุมัติโดยอัตโนมัติ <button type="button" class="link u-sans" data-act="nav" data-id="work">ดูรายการงานซ่อมทั้งหมด</button></p>
    <fieldset><legend>1. เลือกเครื่องจักร</legend>
      <label for="qr-filter" class="sr">ค้นหาเครื่อง</label><input id="qr-filter" class="qr-input" data-qr="filter" value="${esc(q.filter)}" placeholder="ค้นหาด้วยรหัสหรือชื่อเครื่องจักร" autocomplete="off">
      <div class="qr-assets" id="qr-assets">${list.map((a) => `<button type="button" class="opt ${q.asset === a.id ? 'on' : ''}" aria-pressed="${q.asset === a.id}" data-act="qr-asset" data-id="${esc(a.id)}"><span class="mono u-w500">${esc(a.id)}</span><span class="hint">${esc(a.name)}</span></button>`).join('') || '<p class="hint">ไม่พบเครื่องจักรที่ตรงกับคำค้นหา</p>'}</div>
    </fieldset>
    <fieldset><legend>2. ระบุอาการผิดปกติ</legend>
      <div class="qr-chips">${SYMPTOMS.map((x) => `<button type="button" class="chip ${q.symptoms.includes(x) ? 'on' : ''}" aria-pressed="${q.symptoms.includes(x)}" data-act="qr-sym" data-id="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <label for="qr-note" class="sr">รายละเอียดเพิ่มเติม</label><textarea id="qr-note" class="qr-input" data-qr="note" rows="2" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)">${esc(q.note)}</textarea>
    </fieldset>
    <fieldset><legend>3. สถานะเครื่องจักรขณะนี้</legend>
      <div class="qr-two"><button type="button" class="opt big ${q.stopped === true ? 'stop' : ''}" aria-pressed="${q.stopped === true}" data-act="qr-stop" data-id="1">หยุดทำงาน</button><button type="button" class="opt big ${q.stopped === false ? 'on' : ''}" aria-pressed="${q.stopped === false}" data-act="qr-stop" data-id="0">ยังทำงานได้</button></div>
    </fieldset>
    <div class="qr-photo">${q.photo
      ? `<img src="${esc(q.photo)}" alt="ภาพที่แนบ"><button type="button" class="btn small" data-act="qr-photo-del">ลบภาพ</button>`
      : `<label class="photo-drop" for="qr-file"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>แนบภาพถ่ายอาการ <span class="hint">ช่วยให้ช่างเตรียมอะไหล่และเครื่องมือได้ถูกต้อง</span></label><input id="qr-file" type="file" accept="image/*" capture="environment" class="sr">`}</div>
    <div class="qr-foot"><span class="hint" id="qr-hint" style="${ready ? '' : 'color:var(--stop-fg)'}">${ready ? (q.stopped ? 'ระบบจะแจ้งหัวหน้าแผนกซ่อมบำรุงทันที เนื่องจากเครื่องจักรหยุดทำงาน' : 'งานจะเข้าคิวตรวจสอบภายในกะปัจจุบัน') : missing}</span>
      <button class="btn solid big" ${ready ? '' : 'disabled'}>ส่งใบแจ้งซ่อม</button></div>
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('ไม่สามารถอ่านไฟล์ภาพได้ กรุณาถ่ายภาพใหม่อีกครั้ง')); };
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
  const P = [['stop', 'เครื่องหยุด', 'ไลน์ผลิตหยุดหรือมีของเสียหลุดรอด ต้องดำเนินการทันที', 'var(--stop)'], ['slow', 'ทำงานได้แต่ผิดปกติ', 'ดำเนินการภายในกะปัจจุบัน ก่อนส่งผลให้เครื่องหยุด', 'var(--wait)'], ['plan', 'ดำเนินการตามแผนได้', 'วางแผนดำเนินการช่วงเปลี่ยนรุ่นหรือวันหยุดซ่อมบำรุง', 'var(--run)']];
  return `<div class="drawer-wrap"><button type="button" class="scrim" data-act="panel-close" aria-label="ปิด" tabindex="-1"></button>
    <form class="drawer create" role="dialog" aria-modal="true" aria-labelledby="cp-h" data-form="create">
      <div class="dhead"><div><h2 id="cp-h" style="font-size:var(--text-lg);line-height:1.35">สร้างงานใหม่</h2><span class="mono dim" style="font-size:var(--text-xs)">ฉบับร่าง เมื่อส่งแล้วจะรอหัวหน้าแผนกอนุมัติ</span></div>
        <button type="button" class="iconbtn" data-act="panel-close" aria-label="ปิด"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="dbody cbody">
        <div class="field"><label for="cp-title">ชื่องาน</label><input id="cp-title" data-c="title" value="${esc(c.title)}" placeholder="เช่น เปลี่ยนไส้กรองหัวดูด MNT-103" style="min-height:48px;font-size:var(--text-md)" autocomplete="off"></div>
        <fieldset><legend>ประเภทงาน</legend><div class="optgrid">${Object.entries(TYPE).map(([k, l]) => `<button type="button" ${opt(c.type === k)} data-act="c-type" data-id="${k}">${l}</button>`).join('')}</div></fieldset>
        <div class="cgrid">
          <div class="field"><label for="cp-asset">เครื่องจักร</label><select id="cp-asset" data-c="asset" data-rerender="1"><option value="">เลือกเครื่อง</option>${state.assets.map((x) => `<option value="${esc(x.id)}" ${c.asset === x.id ? 'selected' : ''}>${esc(x.id)} · ${esc(x.name)}</option>`).join('')}</select>
            <span class="hint">${a ? `${esc(a.line)}, ระดับความสำคัญ ${esc(a.cls)}` : 'ต้องระบุเครื่องจักรเพื่อบันทึกประวัติการซ่อม'}</span></div>
          <div class="field"><label for="cp-due">กำหนดเสร็จ</label><input id="cp-due" type="date" data-c="due" value="${esc(c.due)}"><span class="hint">ไม่บังคับ</span></div>
        </div>
        <fieldset><legend>ผลกระทบ</legend><div style="display:flex;flex-direction:column;gap:var(--space-xs)">${P.map(([k, l, d, col]) => `<button type="button" ${opt(c.prio === k)} data-act="c-prio" data-id="${k}" style="display:grid;grid-template-columns:12px minmax(0,1fr);gap:var(--space-sm);text-align:left;align-items:start;padding:var(--space-sm) var(--space-sm)"><span style="width:12px;height:12px;margin-top:4px;border-radius:6px;background:${col}"></span><span style="display:flex;flex-direction:column;gap:var(--space-3xs)"><b class="u-w500">${l}</b><span class="hint">${d}</span></span></button>`).join('')}</div></fieldset>
        <fieldset><legend>มอบหมายให้ <span class="hint u-w400">เลือกได้หลายคน โดยคนแรกเป็นผู้รับผิดชอบหลัก</span></legend><div style="display:flex;flex-wrap:wrap;gap:var(--space-xs)">${peopleList().map((n) => { const on = c.people.includes(n); return `<button type="button" ${opt(on)} data-act="c-person" data-id="${esc(n)}" style="height:44px;padding:0 var(--space-sm) 0 var(--space-2xs);border-radius:22px;display:inline-flex;align-items:center;gap:var(--space-xs)">${avatar(n, false).replace('class="avatar ', `class="avatar ${on ? 'dark ' : ''}`)}${esc(n)}</button>`; }).join('')}</div></fieldset>
        <div class="field"><span style="font-size:var(--text-sm);font-weight:500">รายการตรวจ <span class="hint u-w400">${c.checks.filter((x) => x.done).length} / ${c.checks.length}</span></span>
          <div class="box" style="border-radius:var(--radius-card)">${c.checks.map((x, i) => `<div class="list-row" style="grid-template-columns:minmax(0,1fr) auto;align-items:center;padding:var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm)"><span>${esc(x.text)}</span><button type="button" class="iconbtn" style="width:32px;height:32px" data-act="c-uncheck" data-id="${i}" aria-label="ลบรายการ ${esc(x.text)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`).join('')}
            <div style="display:flex;gap:var(--space-xs);padding:var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm);background:var(--hover)"><label for="cp-new" class="sr">เพิ่มรายการตรวจ</label><input id="cp-new" data-c="newCheck" value="${esc(c.newCheck)}" placeholder="เพิ่มรายการตรวจ แล้วกด Enter" style="flex:1;min-width:0;height:40px;border:0;background:transparent" autocomplete="off"><button type="button" class="btn small" data-act="c-add">เพิ่ม</button></div></div></div>
        <div class="field"><label for="cp-note">รายละเอียดเพิ่มเติม</label><textarea id="cp-note" data-c="note" rows="3" placeholder="อาการที่พบและข้อควรระวัง">${esc(c.note)}</textarea></div>
      </div>
      <div class="cfoot"><span class="hint" id="cp-hint" style="${ready ? '' : 'color:var(--stop-fg)'}">${ready ? (c.people.length ? `มอบหมาย ${c.people.length} คน` : 'ยังไม่ได้มอบหมาย งานจะเข้าสู่คิวงานรวม') : 'กรุณาระบุชื่องานและเลือกเครื่องจักรก่อนสร้างงาน'}</span>
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
      : type === 'use'
        ? `<select id="f-${name}" name="${name}">${Object.entries(USE).map(([k, [th, en]]) => `<option value="${k}" ${(d[name] || 'inuse') === k ? 'selected' : ''}>${th} (${en})</option>`).join('')}</select>`
      : type === 'cls'
        ? `<select id="f-${name}" name="${name}">${['A', 'B', 'C'].map((c) => `<option ${(d[name] || 'B') === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`
        : `<input id="f-${name}" name="${name}" type="${type}" value="${esc(d[name])}" ${extra}>`
  }</div>`).join('');
  return `<form class="box" data-form="${kind}"><div class="bar"><h2>${title}</h2></div><div class="pad">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:var(--space-sm) var(--space-md)">${html}</div>
    <div class="actions"><button class="btn solid">บันทึก</button><button type="button" class="btn" data-act="close-form">ยกเลิก</button></div></div></form>`;
}

const FIELDS = {
  assets: [['id', 'รหัสเครื่อง เช่น MNT-103', 'text', 'required pattern="[A-Za-z0-9\\-]+"'], ['name', 'ชื่อเครื่อง', 'text', 'required'], ['line', 'ตำแหน่ง'], ['cls', 'ระดับความสำคัญ', 'cls'], ['category', 'หมวดเครื่อง เช่น Machine Ferrule'], ['use', 'สถานะการใช้งาน', 'use'], ['maker', 'ผู้ผลิต'], ['model', 'รุ่น'], ['year', 'ปีที่ติดตั้ง'], ['wi', 'เลขที่ใบตรวจ TPM (WI)'], ['serial', 'Serial No.'], ['assetNo', 'Asset No.'], ['installed', 'วันที่ติดตั้ง (ปปปป-ดด-วว)'], ['area', 'กระบวนการ / พื้นที่ใช้งาน'], ['owner', 'ผู้รับผิดชอบ'], ['docUrl', 'ลิงก์เอกสาร WI (https://)']],
  pmPlans: [['asset', 'เครื่องจักร', 'asset'], ['task', 'งานที่ต้องทำ', 'text', 'required'], ['intervalDays', 'ทำทุกกี่วัน', 'number', 'required min="1"'], ['first', 'ครบกำหนด', 'date', 'required']],
  parts: [['id', 'รหัส', 'text', 'required pattern="[A-Za-z0-9.\\-]+"'], ['name', 'รายการ', 'text', 'required'], ['price', 'ราคาต่อหน่วย (บาท)', 'number'], ['unit', 'หน่วยนับ เช่น ชิ้น ml'], ['bin', 'ที่เก็บ'], ['qty', 'คงเหลือ', 'number', 'required min="0"'], ['min', 'จุดสั่งซื้อ (Min)', 'number', 'required min="0"'], ['max', 'สต็อกสูงสุด (Max)', 'number', 'min="0"']],
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

/* ---------- ใบตรวจ TPM ของเครื่อง ---------- */
const FREQ_TH = { 1: 'ทุกวัน', 7: 'ทุกสัปดาห์', 14: 'ทุก 2 สัปดาห์', 30: 'ทุกเดือน', 60: 'ทุก 2 เดือน', 90: 'ทุก 3 เดือน', 180: 'ทุก 6 เดือน', 360: 'ทุกปี', 365: 'ทุกปี', 720: 'ทุก 2 ปี' };
const freqLabel = (f) => FREQ_TH[f] || `ทุก ${f} วัน`;
const canInspect = () => ['admin', 'tech', 'operator'].includes(state.user?.role);
const checklistOf = (a) => (a?.wi ? state.checklists.find((c) => c.id === a.wi) : null);
// จุดตรวจถึงรอบเมื่อยังไม่เคยตรวจ หรือผ่านมาครบจำนวนวันของรอบแล้ว
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const tpmDue = (last, freq, t0 = startOfToday()) => !last || t0 - startOfDay(last) >= freq * DAY;

function loadTpm(id) {
  if (state.tpm[id]?.status === 'loading') return;
  state.tpm[id] = { status: 'loading', data: state.tpm[id]?.data || { last: {} } };
  state.backend.getTpmState(id)
    .then((data) => { state.tpm[id] = { status: 'ok', data }; refresh(); })
    .catch((err) => { console.warn('อ่านผลตรวจ TPM ไม่ได้', err); state.tpm[id] = { status: 'error', data: { last: {} } }; refresh(); });
}

function tpmBox(a) {
  if (!a) return '';
  const cl = checklistOf(a);
  if (!cl) {
    if (!a.wi) return '';
    return `<section class="box" aria-label="ใบตรวจ TPM"><div class="bar"><h2>ใบตรวจ TPM</h2><span class="mono dim">${esc(a.wi)}</span></div><p class="empty">ยังไม่มีใบตรวจเลขที่นี้ในระบบ ${canAdmin() ? 'นำเข้าได้ที่หน้าตั้งค่า' : 'กรุณาแจ้งแอดมิน'}</p></section>`;
  }
  if (!state.tpm[a.id]) setTimeout(() => loadTpm(a.id));
  const st = state.tpm[a.id] || { status: 'loading', data: { last: {} } };
  const last = st.data.last || {};
  const sel = state.tpmSel[a.id] || {};
  const t0 = startOfToday();
  const items = cl.items.map((it, i) => ({ ...it, i, due: tpmDue(last[i], it.freq, t0) }));
  const dueN = items.filter((x) => x.due).length;
  const picked = Object.keys(sel).length;
  const can = canInspect();
  const groups = [...new Set(items.map((x) => x.freq))].sort((x, y) => x - y);
  const row = (x) => `<li class="tpm-row${x.due ? ' due' : ''}">
      <span class="tpm-n mono">${x.i + 1}</span>
      <span class="tpm-t"><b>${esc(x.part)}</b>${x.check ? `<span>ตรวจ: ${esc(x.check)}</span>` : ''}${x.std ? `<span>เกณฑ์: ${esc(x.std)}</span>` : ''}</span>
      <span class="tpm-s">${x.due ? '<span class="tpm-due">ถึงรอบตรวจ</span>' : `<span class="dim">ตรวจล่าสุด <span class="mono">${fmtDate(last[x.i])}</span></span>`}</span>
      ${can ? `<span class="tpm-ok" role="group" aria-label="ผลตรวจจุดที่ ${x.i + 1}"><button type="button" class="tpm-b" data-act="tpm-mark" data-id="${x.i}:ok" aria-pressed="${sel[x.i] === 'ok'}">ผ่าน</button><button type="button" class="tpm-b ng" data-act="tpm-mark" data-id="${x.i}:ng" aria-pressed="${sel[x.i] === 'ng'}">ไม่ผ่าน</button></span>` : ''}
    </li>`;
  const ng = state.tpmNg && state.tpmNg.asset === a.id ? state.tpmNg : null;
  return `<section class="box tpm" aria-label="ใบตรวจ TPM" id="tpm">
    <div class="bar"><h2>ใบตรวจ TPM</h2><span class="dim"><span class="mono">${esc(cl.id)}</span> ${esc(cl.name || '')}</span></div>
    <div class="pad tpm-head">
      <p>${st.status === 'loading' ? 'กำลังโหลดผลตรวจล่าสุด' : st.status === 'error' ? 'อ่านผลตรวจล่าสุดไม่ได้ กรุณาแจ้งแอดมินให้เผยแพร่กฎความปลอดภัยชุดใหม่' : `ถึงรอบตรวจ <b class="mono">${dueN}</b> จาก <span class="mono">${items.length}</span> จุด${st.data.lastAt ? ` ตรวจล่าสุด ${fmtDate(st.data.lastAt)} โดย ${esc(st.data.lastBy || '—')}` : ' ยังไม่เคยบันทึกผลตรวจ'}`}</p>
      ${can ? `<div class="actions"><button type="button" class="btn small" data-act="tpm-all-ok" data-id="${esc(a.id)}" ${dueN ? '' : 'disabled'}>ผ่านทุกจุดที่ถึงรอบ</button><button type="button" class="btn solid small" data-act="tpm-save" data-id="${esc(a.id)}" ${picked ? '' : 'disabled'}>บันทึกผลตรวจ${picked ? ` ${picked} จุด` : ''}</button></div>` : ''}
    </div>
    ${ng ? `<div class="notice err u-mbox"><b>ไม่ผ่าน ${ng.items.length} จุด:</b> ${ng.items.map((x) => esc(x.part)).join(', ')}<div class="actions"><button type="button" class="btn small solid" data-act="tpm-report" data-id="${esc(a.id)}">แจ้งซ่อมจากจุดที่ไม่ผ่าน</button><button type="button" class="btn small" data-act="tpm-ng-close">ปิด</button></div></div>` : ''}
    ${groups.map((f) => `<div class="tpm-g"><h3>${freqLabel(f)}</h3><ol class="tpm-list">${items.filter((x) => x.freq === f).map(row).join('')}</ol></div>`).join('')}
  </section>`;
}

function viewAssets(m) {
  const form = recordForm('assets');
  const a = assetOf(state.selectedAsset) || state.assets[0];
  const stateOf = (id) => {
    const wo = m.open.find((w) => w.asset === id && w.type === 'breakdown');
    if (!wo) return ['run', 'เดินเครื่อง'];
    return wo.status === 'parts' ? ['parts', 'รออะไหล่'] : ['doing', 'หยุดเสีย'];
  };
  // ค้นหา กรองตามตำแหน่งและสถานะการใช้งาน แบ่งหน้าละ 30 เครื่อง
  const f = state.af;
  const q = f.q.trim().toLowerCase();
  const lines = [...new Set(state.assets.map((x) => x.line || ''))].filter(Boolean).sort();
  const list = state.assets.filter((x) => (!f.line || x.line === f.line) && (!f.use || useOf(x) === f.use)
    && (!q || `${x.id} ${x.name} ${x.model || ''} ${x.maker || ''} ${x.category || ''}`.toLowerCase().includes(q)));
  const per = fitOn() ? (state.fitRows.assets || 14) : 30;
  const pages = Math.max(1, Math.ceil(list.length / per));
  f.page = Math.min(f.page, pages - 1);
  const rows = list.slice(f.page * per, f.page * per + per).map((x) => {
    const [s, label] = stateOf(x.id);
    const u = useOf(x);
    return `<tr class="pick" data-act="open-asset" data-id="${esc(x.id)}"${x.id === a?.id ? ' aria-current="true"' : ''}>
      <td><span class="u-row">${andon(machineState(x).k)}<button type="button" class="link tagl" data-act="open-asset" data-id="${esc(x.id)}">${esc(x.id)}</button></span></td><td>${esc(x.name)}</td>
      <td class="dim">${esc(x.line)}</td><td class="dim">${esc(x.category || '—')}</td><td class="mono">${esc(x.cls || '—')}</td>
      <td class="mono num">${hours(mergedDown(x.id, m.from, m.now))}</td>
      <td>${u !== 'inuse' && s === 'run' ? `<span class="use use-${u}">${USE[u][0]}</span>` : s === 'run' ? '<span class="lamp" style="--c:var(--run)">เดินเครื่อง</span>' : lamp(s, label)}</td></tr>`;
  }).join('');
  const filterBar = `<div class="wobar">
      <div class="wosearch"><span class="sicon">${icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>')}</span><label for="af-q" class="sr">ค้นหาเครื่อง</label><input id="af-q" type="search" autocomplete="off" placeholder="ค้นหารหัส ชื่อ รุ่น หรือผู้ผลิต" value="${esc(f.q)}"></div>
      <label for="af-line" class="sr">ตำแหน่ง</label><select id="af-line" class="fsel" data-af="line"><option value="">ทุกตำแหน่ง</option>${lines.map((l) => `<option ${f.line === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <label for="af-use" class="sr">สถานะการใช้งาน</label><select id="af-use" class="fsel" data-af="use"><option value="">ทุกสถานะการใช้งาน</option>${Object.entries(USE).map(([k, [th, en]]) => `<option value="${k}" ${f.use === k ? 'selected' : ''}>${th} (${en})</option>`).join('')}</select>
      <span class="dim u-small">${list.length} จาก ${state.assets.length} เครื่อง</span>
    </div>`;
  const pager = pages > 1 ? `<nav class="pager" aria-label="เลขหน้าเครื่องจักร"><span class="mono">${f.page * per + 1}–${Math.min(list.length, f.page * per + per)} จาก ${list.length}</span>
      <button type="button" class="pbtn" data-act="af-page" data-id="-1" ${f.page === 0 ? 'disabled' : ''} aria-label="หน้าก่อนหน้า">${icon('<path d="m15 6-6 6 6 6"/>')}</button>
      <button type="button" class="pbtn" data-act="af-page" data-id="1" ${f.page >= pages - 1 ? 'disabled' : ''} aria-label="หน้าถัดไป">${icon('<path d="m9 6 6 6-6 6"/>')}</button></nav>` : '';
  let detail = '';
  if (a) {
    const hist = wosOf(a.id).slice(0, 8);
    const pms = [...pmsOf(a.id)].sort((x, y) => x.dueDate - y.dueDate);
    const t0 = startOfToday();
    detail = `<div class="split">
      <section class="box w2"><div class="bar"><h2 style="display:flex;gap:var(--space-sm);align-items:baseline"><span class="mono">${esc(a.id)}</span>${esc(a.name)}</h2><span class="actions">${editBtn('assets', a.id)}${delBtn('assets', a.id, 'ลบเครื่องนี้')}</span></div>
        <dl class="facts"><div><dt>ตำแหน่ง</dt><dd>${esc(a.line || '—')}</dd></div><div><dt>หมวดเครื่อง</dt><dd>${esc(a.category || '—')}</dd></div><div><dt>สถานะการใช้งาน</dt><dd>${USE[useOf(a)][0]} (${USE[useOf(a)][1]})</dd></div><div><dt>ระดับความสำคัญ</dt><dd>${esc(a.cls || '—')}</dd></div>
          <div><dt>ผู้ผลิต</dt><dd>${esc(a.maker || '—')}</dd></div><div><dt>รุ่น</dt><dd class="mono">${esc(a.model || '—')}</dd></div>
          <div><dt>${a.installed ? 'วันที่ติดตั้ง' : 'ปีที่ติดตั้ง'}</dt><dd class="mono">${a.installed ? fmtDateY(new Date(`${a.installed}T00:00:00`).getTime()) : esc(a.year || '—')}</dd></div><div><dt>หยุด 7 วัน</dt><dd class="mono">${hours(mergedDown(a.id, m.from, m.now))} ชม.</dd></div>
          ${a.serial ? `<div><dt>Serial No.</dt><dd class="mono">${esc(a.serial)}</dd></div>` : ''}${a.assetNo ? `<div><dt>Asset No.</dt><dd class="mono">${esc(a.assetNo)}</dd></div>` : ''}
          ${a.area ? `<div><dt>กระบวนการ</dt><dd>${esc(a.area)}</dd></div>` : ''}${a.owner ? `<div><dt>ผู้รับผิดชอบ</dt><dd>${esc(a.owner)}</dd></div>` : ''}
          ${a.wi || a.docUrl ? `<div><dt>เอกสาร WI</dt><dd>${a.docUrl && /^https:\/\//.test(a.docUrl) ? `<a class="link" href="${esc(a.docUrl)}" target="_blank" rel="noopener noreferrer">${esc(a.wi || 'เปิดเอกสาร')}</a>` : `<span class="mono">${esc(a.wi)}</span>`}</dd></div>` : ''}</dl>
        <div class="bar" style="border-top:1px solid var(--ink)"><h2>แผน PM ของเครื่องนี้</h2></div>
        ${pms.map((p) => `<div class="list-row"><span class="mono ${p.dueDate < t0 ? 'alarm' : ''}">${fmtDate(p.dueDate)}</span><span class="t"><span>${esc(p.task)}</span><span class="s">ทุก ${p.intervalDays} วัน</span></span><span></span></div>`).join('') || '<p class="empty">ยังไม่มีแผน PM</p>'}
      </section>
      <section class="box w3 u-gap0"><div class="bar"><h2>ประวัติงาน</h2></div>
        ${hist.length ? `<div class="scroll"><table style="min-width:520px"><thead><tr><th scope="col">วันที่</th><th scope="col">งาน</th><th scope="col">สาเหตุ</th><th scope="col" class="num">หยุด (ชม.)</th></tr></thead><tbody>
          ${hist.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}"><td class="mono u-nowrap">${fmtDate(w.startAt)}</td><td>${esc(w.title)}<span class="sub"><span class="mono">${esc(w.id)}</span><span>${STATUS[w.status][0]}</span></span></td><td class="mono">${esc(w.cause || '—')}</td><td class="mono num">${['inspect', 'improve'].includes(w.type) || (w.imported && !w.hasTime) ? '—' : hours((w.endAt ?? m.now) - w.startAt)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">ยังไม่มีงาน</p>'}</section></div>${tpmBox(a)}`;
  }
  return `${form}${state.assets.length ? filterBar : ''}<section class="box" aria-label="ทะเบียนเครื่องจักร">${rows ? `<div class="scroll"><table style="min-width:760px"><thead><tr><th scope="col">รหัส</th><th scope="col">ชื่อเครื่อง</th><th scope="col">ตำแหน่ง</th><th scope="col">หมวด</th><th scope="col">ระดับ</th><th scope="col" class="num">หยุด 7 วัน</th><th scope="col">สถานะ</th></tr></thead><tbody>${rows}</tbody></table></div>${pager}` : `<p class="empty">${state.assets.length ? 'ไม่พบเครื่องที่ตรงกับเงื่อนไข' : 'ยังไม่มีเครื่องจักร'}</p>`}</section>${detail}`;
}

/* ---------- SH-04 แผน PM ---------- */
function viewPm() {
  const form = recordForm('pmPlans');
  const t0 = startOfToday();
  const c = pmCompliance(Date.now() - 30 * DAY);
  const summary = `<section class="stats" aria-label="สรุปแผน PM">
    <div class="stat"><span class="label">PM compliance 30 วัน</span><span class="fig ${c.pct < 90 ? 'alarm' : ''}">${c.pct.toFixed(0)}<small>%</small></span><span class="cap">ทันกำหนด ${c.onTime} จาก ${c.done + c.late} งาน (เป้าหมาย 90%)</span></div>
    <div class="stat"><span class="label">เลยกำหนดตอนนี้</span><span class="fig ${c.late ? 'alarm' : ''}">${c.late}<small> งาน</small></span><span class="cap">นับรวมเป็นงานไม่ทันกำหนด</span></div>
    <div class="stat"><span class="label">แผน PM ทั้งหมด</span><span class="fig">${state.pmPlans.length}<small> แผน</small></span><span class="cap">ครอบคลุม ${new Set(state.pmPlans.map((p) => p.asset)).size} จาก ${state.assets.length} เครื่อง</span></div>
  </section>`;
  // ภาพรวมทั้งปี: แผนเทียบทำจริงรายเดือน
  const y = state.pmYear;
  const nowD = new Date();
  const pmDone = state.workOrders.filter((w) => w.type === 'pm' && w.status === 'done' && w.endAt);
  const cols = TH_MON.map((label, mi) => {
    const from = new Date(y, mi, 1).getTime(); const to = new Date(y, mi + 1, 1).getTime();
    const done = pmDone.filter((w) => w.endAt >= from && w.endAt < to).length;
    const due = state.pmPlans.reduce((n, p) => n + pmOccur(p, from, to).length, 0);
    return { label, values: [done + due, done], on: y === nowD.getFullYear() && mi === nowD.getMonth() };
  });
  // สถานะตามกำหนดและรอบความถี่
  const dueParts = [
    { k: 'stop', label: 'เลยกำหนด', n: state.pmPlans.filter((p) => p.dueDate < t0).length },
    { k: 'wait', label: 'ภายใน 7 วัน', n: state.pmPlans.filter((p) => p.dueDate >= t0 && p.dueDate <= t0 + 7 * DAY).length },
    { k: 'pm', label: 'ภายใน 30 วัน', n: state.pmPlans.filter((p) => p.dueDate > t0 + 7 * DAY && p.dueDate <= t0 + 30 * DAY).length },
    { k: 'run', label: 'มากกว่า 30 วัน', n: state.pmPlans.filter((p) => p.dueDate > t0 + 30 * DAY).length }
  ];
  const fq = new Map();
  state.pmPlans.forEach((p) => fq.set(p.intervalDays, (fq.get(p.intervalDays) || 0) + 1));
  const fqParts = [...fq].sort((a, b) => a[0] - b[0]).map(([d, n], i) => ({ k: ['ink', 'pm', 'late', 'wait', 'run', 'stop'][i % 6], label: freqLabel(d), n }));
  const overview = state.pmPlans.length ? `<div class="split">
      <section class="box w3"><div class="bar"><h2>แผนเทียบทำจริง ปี ${y + 543}</h2>
        <span class="u-row"><button type="button" class="pbtn" data-act="pm-year" data-id="-1" aria-label="ปีก่อนหน้า">${icon('<path d="m15 6-6 6 6 6"/>')}</button><span class="mono">${y + 543}</span><button type="button" class="pbtn" data-act="pm-year" data-id="1" aria-label="ปีถัดไป">${icon('<path d="m9 6 6 6-6 6"/>')}</button></span></div>
        <div class="pad">${mbars(cols, [{ name: 'ตามแผน' }, { name: 'ทำแล้ว', cls: 'mb-s2' }], `จำนวน PM ตามแผนและที่ทำแล้วรายเดือน ปี ${y + 543}`)}<p class="hint">เดือนที่ผ่านมานับงานที่ทำแล้วรวมกับงานที่ยังค้าง เดือนถัดไปคำนวณจากรอบของแต่ละแผน</p></div></section>
      <section class="box w2"><div class="bar"><h2>ตามกำหนด</h2></div><div class="pad">${meter(dueParts, 'แผน PM ตามระยะเวลาถึงกำหนด')}</div>
        <div class="bar" style="border-top:1px solid var(--line)"><h2>ตามรอบความถี่</h2></div><div class="pad">${meter(fqParts, 'แผน PM ตามรอบความถี่')}</div></section>
    </div>` : '';
  const viewChips = `<div class="chips" role="group" aria-label="มุมมองแผน PM"><button type="button" data-act="pm-view" data-id="list" aria-pressed="${state.pmView === 'list'}">รายการ</button><button type="button" data-act="pm-view" data-id="cal" aria-pressed="${state.pmView === 'cal'}">ปฏิทิน</button></div>`;
  if (state.pmView === 'cal') return `${form}${summary}${overview}${viewChips}${pmCalendar()}`;
  const groups = [['เลยกำหนด', (d) => d < t0, true], ['ภายใน 7 วัน', (d) => d >= t0 && d <= t0 + 7 * DAY], ['ถัดไป', (d) => d > t0 + 7 * DAY]];
  const html = groups.map(([label, test, late]) => {
    const items = state.pmPlans.filter((p) => test(p.dueDate)).sort((a, b) => a.dueDate - b.dueDate);
    if (!items.length) return '';
    return `<section class="box"><div class="bar"><h2 class="${late ? 'alarm' : ''}">${label} <span class="mono dim u-small">${items.length}</span></h2></div>
      <div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">ครบกำหนด</th><th scope="col">เครื่อง</th><th scope="col">งาน</th><th scope="col">รอบ</th><th scope="col"><span class="sr">คำสั่ง</span></th></tr></thead><tbody>
      ${items.map((p) => `<tr><td class="mono ${late ? 'alarm' : ''} u-nowrap">${fmtDate(p.dueDate)}</td><td>${tag(p.asset)}</td><td>${esc(p.task)}</td><td class="dim u-nowrap">ทุก ${p.intervalDays} วัน</td>
        <td class="num"><span class="actions u-end">${canTech() ? `<button type="button" class="btn small" data-act="pm-done" data-id="${esc(p.id)}">บันทึกผลการดำเนินการ</button>` : ''}${editBtn('pmPlans', p.id)}${delBtn('pmPlans', p.id)}</span></td></tr>`).join('')}
      </tbody></table></div></section>`;
  }).join('');
  return `${form}${summary}${overview}${state.pmPlans.length ? viewChips : ''}${html || '<section class="box"><p class="empty">ยังไม่มีแผน PM</p></section>'}`;
}

// วันครบกำหนดของแผนในช่วงเวลา นับจากวันครบกำหนดปัจจุบันไปตามรอบ
function pmOccur(p, from, to) {
  const step = Math.max(1, p.intervalDays) * DAY;
  const t0 = startOfToday();
  const out = [];
  let d = p.dueDate;
  // แผนที่เลยกำหนด นับครั้งเดียวที่วันครบกำหนดเดิม รอบถัดไปนับจากวันนี้
  if (d < t0) { if (d >= from && d < to) out.push(d); d = t0 + step; }
  if (d < from) d += Math.ceil((from - d) / step) * step;
  for (; d < to; d += step) out.push(d);
  return out;
}

// ปฏิทิน PM รายเดือน: เลยกำหนด (แดง) ครบกำหนด (คราม) ทำแล้ว (เขียว)
function pmCalendar() {
  const t0 = startOfToday();
  const base = state.pmMonth ?? new Date(new Date(t0).getFullYear(), new Date(t0).getMonth(), 1).getTime();
  const b = new Date(base);
  const first = new Date(b.getFullYear(), b.getMonth(), 1);
  const startCell = new Date(first); startCell.setDate(1 - first.getDay());
  const monthEnd = new Date(b.getFullYear(), b.getMonth() + 1, 1).getTime();
  const done = state.workOrders.filter((w) => w.type === 'pm' && w.status === 'done' && w.endAt);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startCell); d.setDate(startCell.getDate() + i);
    const ds = d.getTime(); const de = ds + DAY;
    if (i >= 35 && ds >= monthEnd) break;
    const occ = state.pmPlans.filter((p) => pmOccur(p, ds, de).length);
    const late = occ.filter((p) => p.dueDate < t0 && p.dueDate >= ds && p.dueDate < de).length;
    const upcoming = ds >= t0 ? occ.length : 0;
    const fin = done.filter((w) => w.endAt >= ds && w.endAt < de).length;
    cells.push({ ds, inM: d.getMonth() === b.getMonth(), late, upcoming, fin, today: ds === t0 });
  }
  const sel = state.pmDay;
  const dayList = sel != null ? (() => {
    const plans = state.pmPlans.filter((p) => pmOccur(p, sel, sel + DAY).length);
    const fins = done.filter((w) => w.endAt >= sel && w.endAt < sel + DAY);
    return `<section class="box pmday"><div class="bar"><h2>${fmtDateY(sel)}</h2><button type="button" class="link" data-act="pm-day" data-id="">ปิด</button></div>
      ${plans.length ? `<ul class="alist">${plans.map((p) => `<li><span class="tag">${esc(p.asset)}</span><span class="t">${esc(p.task)} <span class="dim">${freqLabel(p.intervalDays)}</span></span><span class="u-row">${p.dueDate < t0 ? `<span class="alarm u-nowrap">เลย ${Math.ceil((t0 - p.dueDate) / DAY)} วัน</span>` : ''}${canTech() && p.dueDate <= sel + DAY - 1 && sel <= t0 ? `<button type="button" class="btn small" data-act="pm-done" data-id="${esc(p.id)}">บันทึกผล</button>` : ''}</span></li>`).join('')}</ul>` : ''}
      ${fins.length ? `<p class="hint u-pad-sm">ทำแล้ว ${fins.length} งาน</p><ul class="alist">${fins.map((w) => `<li><span class="tag">${esc(w.asset)}</span><span class="t"><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.id)}</button> ${esc(w.title)}</span><span class="dim u-nowrap">${esc(w.tech || '')}</span></li>`).join('')}</ul>` : ''}
      ${!plans.length && !fins.length ? '<p class="empty">ไม่มีงาน PM ในวันนี้</p>' : ''}</section>`;
  })() : '';
  return `<section class="box pmcal" aria-label="ปฏิทิน PM"><div class="bar"><h2>${TH_MON[b.getMonth()]} ${b.getFullYear() + 543}</h2>
      <span class="u-row"><button type="button" class="pbtn" data-act="pm-month" data-id="-1" aria-label="เดือนก่อนหน้า">${icon('<path d="m15 6-6 6 6 6"/>')}</button><button type="button" class="btn small" data-act="pm-month" data-id="0">เดือนนี้</button><button type="button" class="pbtn" data-act="pm-month" data-id="1" aria-label="เดือนถัดไป">${icon('<path d="m9 6 6 6-6 6"/>')}</button></span></div>
    <div class="cal-head">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="cal-grid">${cells.map((c) => `<button type="button" class="cal-day${c.inM ? '' : ' out'}${c.today ? ' today' : ''}${sel === c.ds ? ' sel' : ''}" data-act="pm-day" data-id="${c.ds}" aria-label="${esc(`${fmtDateY(c.ds)} เลยกำหนด ${c.late} ครบกำหนด ${c.upcoming} ทำแล้ว ${c.fin}`)}">
        <span class="cal-n mono">${new Date(c.ds).getDate()}</span>
        <span class="cal-chips">${c.late ? `<span class="cal-c late">${c.late}</span>` : ''}${c.upcoming ? `<span class="cal-c due">${c.upcoming}</span>` : ''}${c.fin ? `<span class="cal-c fin">${c.fin}</span>` : ''}</span></button>`).join('')}</div>
    <ul class="mkey inline u-pad-sm"><li><i class="cal-c late" aria-hidden="true"></i>เลยกำหนด</li><li><i class="cal-c due" aria-hidden="true"></i>ครบกำหนด</li><li><i class="cal-c fin" aria-hidden="true"></i>ทำแล้ว</li></ul>
  </section>${dayList}`;
}

/* ---------- SH-05 อะไหล่ ---------- */
function viewParts() {
  const form = recordForm('parts');
  const toOrder = (p) => (needsOrder(p) ? Math.max((p.max || p.min * 2 || 1) - p.qty, 1) : 0);
  const u = (p) => (p?.unit ? ` ${esc(p.unit)}` : '');
  const LV = { out: '<span class="schip s-wait">หมดสต็อก</span>', low: '<span class="schip s-wait">ถึงจุดสั่งซื้อ</span>', ok: '<span class="schip s-ok">ปกติ</span>', none: '<span class="schip s-grey">ยังไม่ตั้งจุดสั่งซื้อ</span>' };
  const can = canTech();
  const st = state.stock;
  const lvOrder = { out: 0, low: 1, ok: 2, none: 3 };
  const rows = [...state.parts].sort((a, b) => lvOrder[partLevel(a)] - lvOrder[partLevel(b)] || a.qty / (a.min || 1) - b.qty / (b.min || 1) || a.id.localeCompare(b.id)).map((p) => `<tr${st?.id === p.id ? ' aria-current="true"' : ''}>
    <td class="mono u-nowrap">${esc(p.id)}</td><td>${esc(p.name)}</td><td class="mono">${esc(p.bin)}</td>
    <td class="mono num ${partLevel(p) === 'out' ? 'alarm' : ''}">${p.qty}${u(p)} / ${p.min}</td><td class="mono num">${p.max || '—'}</td>
    <td class="mono num">${Number(p.price) > 0 ? baht(p.price) : '<span class="dim">—</span>'}</td>
    <td>${LV[partLevel(p)]}</td>
    <td class="mono num">${toOrder(p) ? `<b>${toOrder(p)}</b>` : '<span class="dim">—</span>'}</td>
    <td class="num"><span class="actions u-end">${can ? `<button type="button" class="btn small" data-act="stock-open" data-id="${esc(p.id)}:in">รับเข้า</button><button type="button" class="btn small" data-act="stock-open" data-id="${esc(p.id)}:out" ${p.qty ? '' : 'disabled'}>เบิกออก</button>` : ''}${editBtn('parts', p.id)}${delBtn('parts', p.id)}</span></td></tr>`).join('');
  const orders = state.parts.filter(toOrder);
  const sp = st ? partOf(st.id) : null;
  const stockForm = sp ? `<form class="box" data-form="stock" aria-label="${st.dir === 'in' ? 'รับเข้าสต็อก' : 'เบิกออกจากสต็อก'}"><div class="bar"><h2>${st.dir === 'in' ? 'รับเข้าสต็อก' : 'เบิกออกจากสต็อก'} <span class="mono">${esc(sp.id)}</span> <span class="dim u-w400">${esc(sp.name)} คงเหลือ ${sp.qty}${u(sp)}</span></h2></div>
    <div class="pad"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:var(--space-sm) var(--space-md)">
      <div class="field"><label for="s-qty">จำนวน${u(sp)}</label><input id="s-qty" name="qty" type="number" min="1" ${st.dir === 'out' ? `max="${sp.qty}"` : ''} value="1" required></div>
      <div class="field"><label for="s-ref">เลขที่อ้างอิง</label><input id="s-ref" name="ref" required placeholder="${st.dir === 'in' ? 'เช่น เลขที่ PO หรือใบรับของ' : 'เช่น เลขที่ใบงาน หรือใบเบิก'}"></div>
      <div class="field" style="grid-column:1/-1"><label for="s-note">หมายเหตุ</label><input id="s-note" name="note"></div>
    </div><div class="actions"><button class="btn solid">${st.dir === 'in' ? 'รับเข้า' : 'เบิกออก'}</button><button type="button" class="btn" data-act="stock-close">ยกเลิก</button></div></div></form>` : '';
  const moves = state.stockMoves.slice(0, 20);
  const history = `<section class="box" aria-label="ประวัติการรับเข้าและเบิกออก"><div class="bar"><h2>การรับเข้าและเบิกออกล่าสุด</h2></div>
    ${moves.length ? `<div class="scroll"><table style="min-width:760px"><thead><tr><th scope="col">วันเวลา</th><th scope="col">อะไหล่</th><th scope="col">รายการ</th><th scope="col" class="num">จำนวน</th><th scope="col" class="num">คงเหลือหลังทำรายการ</th><th scope="col">เลขที่อ้างอิง</th><th scope="col">หมายเหตุ</th><th scope="col">ผู้ทำรายการ</th></tr></thead><tbody>
      ${moves.map((m) => `<tr><td class="mono u-nowrap">${fmtDateTime(m.at)}</td><td class="mono">${esc(m.part)}</td><td>${m.dir === 'in' ? '<span class="schip s-ok">รับเข้า</span>' : '<span class="schip s-info">เบิกออก</span>'}</td><td class="mono num">${m.dir === 'in' ? '+' : '−'}${m.qty}</td><td class="mono num">${m.after ?? '—'}</td><td class="mono">${esc(m.ref || '—')}</td><td>${esc(m.note || '')}</td><td>${esc(m.by || '')}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="empty">ยังไม่มีการรับเข้าหรือเบิกออก</p>'}</section>`;
  return `${form}${stockForm}<section class="box" aria-label="คลังอะไหล่">${rows ? `<div class="scroll"><table style="min-width:1060px"><thead><tr><th scope="col">รหัส</th><th scope="col">รายการ</th><th scope="col">ที่เก็บ</th><th scope="col" class="num">คงเหลือ / Min</th><th scope="col" class="num">Max</th><th scope="col" class="num">ราคา/หน่วย (บาท)</th><th scope="col">สถานะ</th><th scope="col" class="num">ควรสั่ง</th><th scope="col"><span class="sr">คำสั่ง</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">ยังไม่มีอะไหล่</p>'}</section>
    <div class="actions"><button type="button" class="btn" data-act="export-order" ${orders.length ? '' : 'disabled'}>ส่งออกรายการสั่งซื้อ ${orders.length} รายการ (CSV)</button><span class="hint">อะไหล่ที่ใช้ซ่อมเครื่อง ควรเบิกผ่านใบงาน เพื่อให้รู้ว่าใช้กับเครื่องใด ส่วนการเบิกอื่นใส่เลขที่อ้างอิงทุกครั้ง</span></div>
    ${history}`;
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
      <div class="stat"><span class="label">ห้ามใช้</span><span class="fig ${n('hold') ? 'alarm' : ''}">${n('hold')}</span><span class="cap">ไม่ผ่านการสอบเทียบ ต้องแยกออกจากไลน์ผลิต</span></div>
      <div class="stat"><span class="label">เลยกำหนด</span><span class="fig ${n('late') ? 'alarm' : ''}">${n('late')}</span><span class="cap">ต้องระงับการใช้งานจนกว่าจะสอบเทียบ</span></div>
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
  const closed = liveWO().filter((w) => w.type === 'breakdown' && timed(w) && w.endAt && w.endAt >= from);
  const mttr = closed.length ? closed.reduce((s, w) => s + w.endAt - w.startAt, 0) / closed.length : 0;
  const pmc = pmCompliance(from);
  const ranked = [...rows].sort((a, b) => b.down - a.down);
  const maxDown = Math.max(...ranked.map((r) => r.down), 1);
  // แสดงเฉพาะเครื่องที่มีเหตุเสียหรือเวลาหยุด (สูงสุด 60 เครื่อง) ตารางจะไม่หน่วงเมื่อมีเครื่องหลายร้อย
  const hit = ranked.filter((r) => r.down > 0 || r.fails > 0);
  const shown = hit.slice(0, 60);
  const restN = rows.length - shown.length;
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
        ${shown.map((r, i) => `<tr class="pick" data-act="open-asset" data-id="${esc(r.a.id)}"><td>${tag(r.a.id)} <span class="dim">${esc(r.a.name)}</span></td>
          <td><span class="u-row"><span style="height:10px;width:${((r.down / maxDown) * 100).toFixed(1)}%;min-width:${r.down ? 2 : 0}px;background:${i === 0 && r.down ? 'var(--stop)' : 'var(--ink-2)'}"></span><span class="mono">${hours(r.down)}</span></span></td>
          <td class="mono num">${r.fails}</td><td class="mono num">${r.mtbf == null ? '—' : hours(r.mtbf)}</td><td class="mono num">${r.mttr == null ? '—' : hours(r.mttr)}</td><td class="mono num">${r.avail.toFixed(1)}%</td></tr>`).join('')}
        ${shown.length ? '' : '<tr><td colspan="6" class="empty">ไม่มีเครื่องหยุดหรือเสียในช่วงนี้</td></tr>'}
        </tbody></table></div>${restN > 0 ? `<p class="hint">เครื่องอื่นอีก ${restN} เครื่องไม่มีเวลาหยุดในช่วง ${state.period} วัน (ดูครบได้จากปุ่มส่งออก CSV)</p>` : ''}</section>
      <section class="box w2 u-gap0"><div class="bar"><h2>สาเหตุการเสีย (Pareto)</h2></div>
        ${causes.length ? `<table><thead><tr><th scope="col">รหัส</th><th scope="col">สาเหตุ</th><th scope="col" class="num">ครั้ง</th><th scope="col" class="num">สะสม</th></tr></thead><tbody>
          ${causes.map(([k, nn]) => { cum += nn; return `<tr><td class="mono">${esc(k)}</td><td>${esc((CAUSES.find(([c]) => c === k) || [, k])[1])}</td><td class="mono num">${nn}</td><td class="mono num">${((100 * cum) / causeTotal).toFixed(0)}%</td></tr>`; }).join('')}
        </tbody></table>` : '<p class="empty">ยังไม่มีงานซ่อมที่ปิดพร้อมรหัสสาเหตุในช่วงนี้</p>'}
        <p class="hint u-pad-sm">ควรแก้ไขสาเหตุที่มีสัดส่วนสะสมถึงประมาณ 80% ก่อน เพื่อลดเวลาหยุดเครื่องได้มากที่สุด</p></section>
    </div>
    ${costSection()}`;
}

// ค่าใช้จ่ายรายเดือน: PM นับตามวันที่ปิดงาน งานซ่อมนับตามวันที่เปิดใบงาน
function costSection() {
  const y = state.costYear;
  const inMonth = (t, mi) => { if (!t) return false; const d = new Date(t); return d.getFullYear() === y && d.getMonth() === mi; };
  const now = new Date();
  const cols = TH_MON.map((label, mi) => {
    const pm = state.workOrders.filter((w) => w.type === 'pm' && w.status === 'done' && inMonth(w.endAt, mi)).reduce((t, w) => t + (Number(w.cost) || 0), 0);
    const cm = liveWO().filter((w) => w.type !== 'pm' && inMonth(w.startAt, mi)).reduce((t, w) => t + (Number(w.cost) || 0), 0);
    return { label, values: [pm, cm], on: y === now.getFullYear() && mi === now.getMonth() };
  });
  const total = cols.reduce((t, c) => t + c.values[0] + c.values[1], 0);
  const top = liveWO().filter((w) => Number(w.cost) > 0 && new Date(w.type === 'pm' ? w.endAt || w.startAt : w.startAt).getFullYear() === y).sort((a, b) => b.cost - a.cost).slice(0, 5);
  return `<section class="box" id="cost"><div class="bar"><h2>ค่าใช้จ่ายซ่อมบำรุง ปี ${y + 543} <span class="dim u-w400">รวม ${baht(total)} บาท</span></h2>
      <span class="u-row"><button type="button" class="pbtn" data-act="cost-year" data-id="-1" aria-label="ปีก่อนหน้า">${icon('<path d="m15 6-6 6 6 6"/>')}</button><span class="mono">${y + 543}</span><button type="button" class="pbtn" data-act="cost-year" data-id="1" aria-label="ปีถัดไป" ${y >= now.getFullYear() ? 'disabled' : ''}>${icon('<path d="m9 6 6 6-6 6"/>')}</button></span></div>
    <div class="pad">${total ? mbars(cols, [{ name: 'PM (บาท)' }, { name: 'งานซ่อม (บาท)' }], `ค่าใช้จ่ายรายเดือน ปี ${y + 543}`, (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : baht(v))) : '<p class="empty">ยังไม่มีใบงานที่บันทึกค่าใช้จ่ายในปีนี้ บันทึกได้ที่ส่วน "ค่าใช้จ่าย" ในใบงาน</p>'}
      <p class="hint">PM นับตามวันที่ปิดงาน งานซ่อมนับตามวันที่เปิดใบงาน ไม่รวมค่าอะไหล่จากคลัง</p></div>
    ${top.length ? `<div class="scroll"><table style="min-width:520px"><thead><tr><th scope="col">ใบงาน</th><th scope="col">เครื่อง</th><th scope="col">เลขที่ PR</th><th scope="col">รายละเอียด</th><th scope="col" class="num">บาท</th></tr></thead><tbody>${top.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}"><td class="mono">${esc(w.id)}</td><td>${tag(w.asset)}</td><td class="mono">${esc(w.prNo || '—')}</td><td>${esc(w.costNote || w.title)}</td><td class="mono num">${baht(w.cost)}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>`;
}

/* ---------- SH-08 ตั้งค่า ---------- */
const ROLE_LABEL = { admin: 'แอดมิน', tech: 'ช่างซ่อมบำรุง', operator: 'ฝ่ายผลิต', disabled: 'ปิดใช้งาน' };
// ตำแหน่งในแผนก ผูกกับสิทธิ์ในระบบ: admin อนุมัติและจัดการทุกอย่าง, tech ซ่อมและปิดงาน, operator แจ้งซ่อมและดูข้อมูล
const POSITIONS = { machine: ['Machine', 'tech'], design: ['Design', 'tech'], document: ['Document', 'operator'], asst_manager: ['ASST. Manager', 'admin'], advisor: ['Advisor', 'admin'], admin_web: ['Admin Website', 'admin'] };
const userLabel = (u) => (u.role === 'disabled' ? ROLE_LABEL.disabled : POSITIONS[u.position]?.[0] || ROLE_LABEL[u.role] || 'ยังไม่มีสิทธิ์');
const IMPORT_COLS = {
  assets: ['id', 'name', 'line', 'cls', 'category', 'use', 'maker', 'model', 'year', 'wi', 'serial', 'asset_no', 'installed', 'area', 'owner', 'doc_url', 'map', 'map_x', 'map_y'],
  parts: ['id', 'name', 'unit', 'bin', 'qty', 'min', 'max', 'price'],
  pmPlans: ['id', 'asset', 'task', 'interval_days', 'due_date', 'source'],
  workOrders: ['ref', 'section', 'request_date', 'complete_date', 'condition', 'type', 'status', 'machine_code', 'machine_name', 'process', 'detail', 'action', 'action_by', 'cost', 'note', 'start_time', 'end_time', 'team', 'priority'],
  checklists: ['wi', 'machine_type', 'kind', 'part', 'check', 'freq_days', 'standard']
};
const IMPORT_SAMPLE = {
  assets: [['MNT-103', 'เครื่องติดตั้งชิ้นส่วนความเร็วสูง', 'ไลน์ SMT 1', 'A', 'Machine SMT', 'In Use', 'FUJI', 'NXT-III', '2562', '', 'SN-0001', '009510', '2019-11-14', 'SMT', 'สมชาย ก.', 'https://example.sharepoint.com/wi']],
  workOrders: [['FR-M26-001', 'Ferrule', '2026-01-06', '2026-01-13', 'Machine Repair', 'breakdown', 'done', 'MNT-103', 'เครื่องติดตั้งชิ้นส่วน', 'SMT', 'ร้องขอให้ซ่อมหัวดูด', 'เปลี่ยน Bearing และปรับตั้ง', 'สมชาย ก.', '', '']],
  parts: [['NZL-1005', 'หัวดูด ขนาด 1005', 'ชิ้น', 'A-02', '2', '6', '12', '350']],
  pmPlans: [['PMP-MNT-103-1', 'MNT-103', 'ทาจาระบี Ball screw แกน X-Y', '30', '2026-12-15', 'แผน PM 2026']],
  checklists: [['WI-TPM-FR-001', 'BIAXIAL POLISHING MACHINE', 'จุดตรวจเช็ค', 'Motor', 'มีเสียงผิดปกติ สั่นสะเทือน', '30', 'ต้องไม่มีเสียงผิดปกติ ไม่สั่นสะเทือน']]
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

// ใบตรวจ TPM: หนึ่งแถวต่อหนึ่งจุดตรวจ รวมเป็นใบตามเลขที่ WI
function importChecklists(rows) {
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r, k) => (r[head.indexOf(k)] ?? '').trim();
  if (!head.includes('wi') || !head.includes('part')) throw new Error(`หัวตารางต้องมีคอลัมน์ ${IMPORT_COLS.checklists.join(', ')}`);
  const map = new Map(); const errors = [];
  rows.slice(1).forEach((r, i) => {
    const wi = col(r, 'wi').toUpperCase();
    const freq = Math.round(Number(col(r, 'freq_days')));
    if (!/^[A-Z0-9._-]+$/.test(wi)) { errors.push(`แถว ${i + 2}: เลขที่ WI "${wi}" ใช้ได้แค่ A-Z 0-9 . _ -`); return; }
    if (!col(r, 'part')) { errors.push(`แถว ${i + 2}: ไม่มีจุดตรวจ`); return; }
    if (!(freq >= 1)) { errors.push(`แถว ${i + 2}: ความถี่ต้องเป็นจำนวนวันตั้งแต่ 1`); return; }
    const c = map.get(wi) || { id: wi, name: col(r, 'machine_type'), items: [] };
    c.items.push({ kind: col(r, 'kind'), part: col(r, 'part'), check: col(r, 'check'), freq, std: col(r, 'standard') });
    map.set(wi, c);
  });
  const out = [...map.values()];
  return { coll: 'checklists', rows: out, errors, points: out.reduce((n, c) => n + c.items.length, 0) };
}

// ใบงานย้อนหลังจาก Job Request list: หนึ่งแถวต่อหนึ่งใบ ใช้เลขที่ Request เป็นเลขที่ใบงาน
// ไม่มีเวลาหยุดเครื่องจริง (มีแต่วันที่) จึงไม่นับใน Availability / MTTR ระบบเก็บไว้เป็นประวัติและจำนวนครั้งที่เสีย
const WO_TYPES = ['breakdown', 'pm', 'inspect', 'improve'];
function importJobs(rows) {
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r, k) => (r[head.indexOf(k)] ?? '').trim();
  if (!head.includes('ref') || !head.includes('request_date')) throw new Error(`หัวตารางต้องมีคอลัมน์ ${IMPORT_COLS.workOrders.join(', ')}`);
  const have = new Set(state.workOrders.map((w) => w.id));
  const out = []; const errors = []; let skipped = 0;
  const day = (t, hm) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) return null;
    const h = /^(\d{1,2}):(\d{2})$/.exec(hm || '');
    return new Date(+m[1], +m[2] - 1, +m[3], h ? +h[1] : 8, h ? +h[2] : 0).getTime();
  };
  const PRI = { urgent: 'stop', high: 'stop', 'สูง': 'stop', normal: 'slow', medium: 'slow', 'กลาง': 'slow', easy: 'plan', low: 'plan', 'ต่ำ': 'plan' };
  rows.slice(1).forEach((r, i) => {
    const id = col(r, 'ref').toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9-]+$/.test(id)) { errors.push(`แถว ${i + 2}: เลขที่ "${id}" ใช้ได้แค่ A-Z 0-9 -`); return; }
    if (have.has(id)) { skipped++; return; }
    // มีเวลาเริ่ม-เสร็จจริง (เช่น รายงานการเข้าซ่อมบำรุง) จะนับใน MTTR และเวลาหยุดได้
    const hasTime = /^\d{1,2}:\d{2}$/.test(col(r, 'start_time')) && /^\d{1,2}:\d{2}$/.test(col(r, 'end_time'));
    const startAt = day(col(r, 'request_date'), hasTime ? col(r, 'start_time') : '');
    if (!startAt) { errors.push(`แถว ${i + 2}: วันที่แจ้ง "${col(r, 'request_date')}" ต้องเป็น ปปปป-ดด-วว`); return; }
    const endDay = day(col(r, 'complete_date') || (hasTime ? col(r, 'request_date') : ''), hasTime ? col(r, 'end_time') : '');
    const status = ['open', 'doing', 'parts', 'done', 'cancelled'].includes(col(r, 'status')) ? col(r, 'status') : (endDay ? 'done' : 'open');
    const detail = col(r, 'detail') || col(r, 'condition') || 'งานจาก Job Request';
    const title = detail.length > 140 ? `${detail.slice(0, 137)}...` : detail;
    const tech = col(r, 'action_by');
    const team = [tech, ...col(r, 'team').split(/[;,]/)].map((x) => x.trim()).filter((x, k, a) => x && a.indexOf(x) === k);
    const asset = col(r, 'machine_code').toUpperCase();
    const closed = status === 'done' || status === 'cancelled';
    out.push({
      id, imported: true, hasTime, refNo: id, section: col(r, 'section'), condition: col(r, 'condition'), process: col(r, 'process'),
      asset, assetName: col(r, 'machine_name'), type: WO_TYPES.includes(col(r, 'type')) ? col(r, 'type') : 'improve', title, note: detail.length > 140 ? detail : '',
      priority: PRI[col(r, 'priority').toLowerCase()] || '', status, startAt, endAt: closed ? Math.max(startAt, endDay ?? startAt) : null,
      tech, team, requestedBy: '', requestedUid: '', approvedBy: 'Job Request', approvedAt: startAt, dueDate: null, checks: [], photo: '',
      cause: '', action: col(r, 'action'), partsUsed: [], cost: Number(col(r, 'cost')) || 0,
      ...(status === 'cancelled' ? { cancelledBy: 'Job Request', cancelReason: col(r, 'note') || 'ยกเลิกตามใบ Job Request' } : {}),
      log: [{ at: startAt, text: `นำเข้าจาก Job Request list (${col(r, 'section') || 'ไม่ระบุแผนก'})` }]
    });
  });
  return { coll: 'workOrders', rows: out, errors, skipped };
}

// ช่องเพิ่มเติมของเครื่อง: หัวตาราง CSV ใช้ตัวเล็กคั่นขีดล่าง ในฐานข้อมูลใช้ camelCase
const ASSET_KEY = { asset_no: 'assetNo', doc_url: 'docUrl' };
const ASSET_REQ = ['id', 'name'];

// แผน PM รายเครื่อง: id, เครื่อง, งาน, ทำทุกกี่วัน, ครบกำหนดครั้งถัดไป นำเข้าซ้ำจะข้ามแผนที่มีอยู่แล้ว (ไม่ทับวันครบกำหนดที่เลื่อนไปแล้ว)
function importPm(rows) {
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r, k) => (r[head.indexOf(k)] ?? '').trim();
  if (!['id', 'asset', 'task', 'interval_days', 'due_date'].every((k) => head.includes(k))) throw new Error(`หัวตารางต้องมีคอลัมน์ ${IMPORT_COLS.pmPlans.join(', ')}`);
  const have = new Set(state.pmPlans.map((p) => p.id));
  const out = []; const errors = []; let skipped = 0; let noAsset = 0;
  rows.slice(1).forEach((r, i) => {
    const id = col(r, 'id').toUpperCase();
    if (!/^[A-Z0-9.\-]+$/.test(id)) { errors.push(`แถว ${i + 2}: รหัสแผน "${id}" ใช้ได้แค่ A-Z 0-9 . -`); return; }
    if (have.has(id)) { skipped++; return; }
    const asset = col(r, 'asset').toUpperCase();
    const interval = Math.round(Number(col(r, 'interval_days')));
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(col(r, 'due_date'));
    if (!col(r, 'task')) { errors.push(`แถว ${i + 2}: ไม่มีงานที่ต้องทำ`); return; }
    if (!(interval >= 1 && interval <= 3650)) { errors.push(`แถว ${i + 2}: รอบ "${col(r, 'interval_days')}" ต้องเป็นจำนวนวัน 1–3650`); return; }
    if (!m) { errors.push(`แถว ${i + 2}: วันครบกำหนด "${col(r, 'due_date')}" ต้องเป็น ปปปป-ดด-วว`); return; }
    if (!assetOf(asset)) noAsset++;
    out.push({ id, asset, task: col(r, 'task').slice(0, 200), intervalDays: interval, dueDate: new Date(+m[1], +m[2] - 1, +m[3]).getTime(), source: col(r, 'source') });
  });
  if (noAsset) errors.push(`มี ${noAsset} แผนที่รหัสเครื่องไม่อยู่ในทะเบียน (ยังนำเข้าได้ แต่ควรนำเข้าเครื่องจักรก่อน)`);
  return { coll: 'pmPlans', rows: out, errors, skipped };
}

function importRows(coll, text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('ไฟล์ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว');
  if (coll === 'checklists') return importChecklists(rows);
  if (coll === 'workOrders') return importJobs(rows);
  if (coll === 'pmPlans') return importPm(rows);
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
    if (coll === 'assets' && 'wi' in o) o.wi = o.wi.toUpperCase();
    if (coll === 'assets' && 'use' in o) o.use = normUse(o.use);
    if (coll === 'parts') {
      // ช่องว่าง: อะไหล่ที่มีอยู่แล้วคงค่าเดิม อะไหล่ใหม่เริ่มที่ 0
      const had = partOf(o.id);
      ['qty', 'min', 'max', 'price'].forEach((k) => {
        if (!(k in o)) return;
        if (o[k] === '') { if (had) delete o[k]; else o[k] = 0; } else o[k] = Math.max(0, Number(o[k]) || 0);
      });
      ['unit', 'bin'].forEach((k) => { if (k in o && o[k] === '' && had) delete o[k]; });
    }
    if (coll === 'assets') {
      // ช่องว่างไม่เขียนทับข้อมูลเดิม นำเข้าซ้ำเพื่อเติมข้อมูลได้
      Object.keys(o).forEach((k) => { if (!ASSET_REQ.includes(k) && o[k] === '') delete o[k]; });
      Object.entries(ASSET_KEY).forEach(([from, to]) => { if (from in o) { o[to] = o[from]; delete o[from]; } });
      if (o.docUrl && !/^https:\/\//.test(o.docUrl)) delete o.docUrl;
      if (o.installed && !/^\d{4}-\d{2}-\d{2}$/.test(o.installed)) delete o.installed;
      // ตำแหน่งบนแผนผังเป็นเปอร์เซ็นต์ของความกว้าง/สูงรูป (0–100)
      if ('map_x' in o || 'map_y' in o) {
        const x = Number(o.map_x), y = Number(o.map_y);
        if (o.map_x !== undefined && o.map_y !== undefined && x >= 0 && x <= 100 && y >= 0 && y <= 100) { o.mapX = Math.round(x * 100) / 10000; o.mapY = Math.round(y * 100) / 10000; }
        delete o.map_x; delete o.map_y;
      }
      if (o.map !== undefined) {
        // ชื่อแผนผัง (ตรงกับชื่อที่เพิ่มในหน้าแผนผังโรงงาน) แผนผังที่ยังไม่มีจะผูกได้เมื่อเพิ่มชื่อเดียวกันภายหลัง
        const m = state.maps.find((mm) => mapName(mm).toLowerCase() === String(o.map).trim().toLowerCase());
        o.mapId = m ? m.id : mapDocId(String(o.map).trim());
        delete o.map;
      }
    }
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
    <p class="hint" style="margin:0 0 var(--space-xs)">กรุณาบันทึกหรือแจ้งรหัสนี้แก่พนักงานทันที เมื่อปิดหน้าต่างนี้แล้วจะไม่สามารถเรียกดูได้อีก พนักงานต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก</p>
    <div class="actions"><button type="button" class="btn small" data-act="copy-temp">คัดลอก</button><button type="button" class="btn small" data-act="issued-close">ปิด</button></div></div>`;
}

function viewServer() {
  const b = state.backend;
  const live = b.mode === 'firebase';
  const admin = canAdmin();
  const colls = { assets: 'เครื่อง', workOrders: 'ใบงาน', pmPlans: 'แผน PM', parts: 'อะไหล่', gauges: 'เครื่องมือวัด' };
  const account = `<section class="box"><div class="bar"><h2>บัญชีของฉัน</h2></div>
    <dl class="kv u-pad"><dt>ชื่อ</dt><dd>${esc(state.user.name)}</dd><dt>รหัสพนักงาน</dt><dd class="mono">${esc(state.user.empId || '—')}</dd><dt>ตำแหน่ง</dt><dd>${esc(userLabel(state.user))}</dd></dl>
    ${live ? `<form class="pad stack u-pt0" data-form="mypass">
      <div class="field"><label for="m-old">รหัสผ่านเดิม</label><input id="m-old" name="current" type="password" required autocomplete="current-password"></div>
      <div class="field"><label for="m-new">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input id="m-new" name="next" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label for="m-new2">ยืนยันรหัสผ่านใหม่</label><input id="m-new2" name="next2" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="actions"><button class="btn">เปลี่ยนรหัสผ่าน</button><button type="button" class="btn" data-act="logout">ออกจากระบบ</button></div></form>` : ''}</section>`;
  const display = `<section class="box"><div class="bar"><h2>การแสดงผล</h2></div>
    <div class="pad stack"><label class="chk"><input type="checkbox" data-pref="fit" ${fitPref() ? 'checked' : ''}><span>จัดแต่ละหน้าให้พอดีหนึ่งจอ ส่วนที่เกินแบ่งเป็นหน้าถัดไป</span></label>
      <p class="hint">ใช้กับจอคอมพิวเตอร์และแท็บเล็ตแนวนอน เปลี่ยนหน้าด้วยปุ่มด้านล่างหรือคีย์ PageUp/PageDown บนโทรศัพท์ยังเลื่อนลงตามปกติ</p></div></section>`;
  if (!admin) return `<div class="split"><div class="w2" style="max-width:560px">${display}${account}</div></div>`;

  const webAdmin = state.user.position === 'admin_web';
  const users = [...state.users].sort((x, y) => (x.role === 'disabled') - (y.role === 'disabled') || x.name.localeCompare(y.name, 'th'));
  const usersBox = `<section class="box"><div class="bar"><h2>ผู้ใช้งาน <span class="mono dim u-small">${users.filter((u) => u.role !== 'disabled').length}</span></h2></div>
    ${live ? `<form class="pad" data-form="user" style="border-bottom:1px solid var(--rule)"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:var(--space-sm);align-items:end">
      <div class="field"><label for="u-name">ชื่อที่แสดง</label><input id="u-name" name="name" required autocomplete="off"></div>
      <div class="field"><label for="u-emp">รหัสพนักงาน</label><input id="u-emp" name="empId" required autocomplete="off" autocapitalize="characters" spellcheck="false" pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{1,19}" title="A-Z 0-9 . _ - ยาว 2–20 ตัว" placeholder="เช่น M0112"></div>
      <div class="field"><label for="u-role">ตำแหน่ง</label><select id="u-role" name="position">${Object.entries(POSITIONS).map(([k, [label]]) => `<option value="${k}">${label}</option>`).join('')}</select></div>
      <button class="btn solid">เพิ่มผู้ใช้</button></div>
      <p class="hint">ระบบจะสร้างรหัสผ่านชั่วคราวให้ โปรดแจ้งพนักงานโดยตรง พนักงานต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก</p></form>
      ${issuedBox()}` : '<p class="notice u-mbox">โหมดตัวอย่างแสดงรายชื่อตัวอย่าง สามารถเพิ่มผู้ใช้จริงได้หลังเชื่อมต่อ Firebase</p>'}
    <div class="scroll"><table style="min-width:680px"><thead><tr><th scope="col">ชื่อ</th><th scope="col">รหัสพนักงาน</th><th scope="col">สิทธิ์</th><th scope="col"><span class="sr">รหัสผ่าน</span></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td><span class="u-row">${avatar(u.name)}${esc(u.name)}${u.id === state.user.uid ? ' <span class="dim">(คุณ)</span>' : ''}</span></td><td class="mono">${esc(u.empId || '—')}${u.mustChange ? ' <span class="dim u-sans">· ยังไม่ได้ตั้งรหัสผ่าน</span>' : ''}</td>
      <td>${u.id === state.user.uid || !live ? esc(userLabel(u)) : `<label for="r-${esc(u.id)}" class="sr">ตำแหน่งของ ${esc(u.name)}</label><select id="r-${esc(u.id)}" data-user-role="${esc(u.id)}" style="height:34px;padding:0 var(--space-xs);border:1px solid var(--field);border-radius:var(--radius-card);background:var(--card)">${u.role !== 'disabled' && !POSITIONS[u.position] ? `<option value="" selected disabled>${esc(ROLE_LABEL[u.role] || u.role)}</option>` : ''}${Object.entries(POSITIONS).map(([k, [label]]) => `<option value="${k}" ${u.role !== 'disabled' && u.position === k ? 'selected' : ''}>${label}</option>`).join('')}<option value="disabled" ${u.role === 'disabled' ? 'selected' : ''}>${ROLE_LABEL.disabled}</option></select>`}</td>
      <td class="num"><span class="u-acts">${live && u.id !== state.user.uid && u.empId ? `<button type="button" class="btn small" data-act="reset-user" data-id="${esc(u.id)}">รีเซ็ตรหัสผ่าน</button>` : ''}${live && webAdmin && u.id !== state.user.uid ? `<button type="button" class="btn small danger" data-act="delete-user" data-id="${esc(u.id)}" aria-label="ลบบัญชีของ ${esc(u.name)}">ลบบัญชี</button>` : ''}</span></td></tr>`).join('')}
    </tbody></table></div></section>`;

  const p = state.importPreview;
  const importBox = `<section class="box w3"><div class="bar"><h2>นำเข้าข้อมูลจาก Excel</h2></div><div class="pad">
    <p class="dim">บันทึกไฟล์ Excel เป็น "CSV UTF-8" ใช้หัวตารางตามไฟล์ตัวอย่าง หากรหัสซ้ำ ระบบจะปรับปรุงข้อมูลเดิม</p>
    <div class="actions"><button type="button" class="btn small" data-act="tpl" data-id="assets">ไฟล์ตัวอย่าง เครื่องจักร</button><button type="button" class="btn small" data-act="tpl" data-id="parts">ไฟล์ตัวอย่าง อะไหล่</button><button type="button" class="btn small" data-act="tpl" data-id="checklists">ไฟล์ตัวอย่าง ใบตรวจ TPM</button><button type="button" class="btn small" data-act="tpl" data-id="workOrders">ไฟล์ตัวอย่าง ใบงานย้อนหลัง</button><button type="button" class="btn small" data-act="tpl" data-id="pmPlans">ไฟล์ตัวอย่าง แผน PM</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:var(--space-sm)">
      <div class="field"><label for="imp-assets">นำเข้าเครื่องจักร</label><input id="imp-assets" type="file" accept=".csv,text/csv" data-import="assets"></div>
      <div class="field"><label for="imp-parts">นำเข้าอะไหล่</label><input id="imp-parts" type="file" accept=".csv,text/csv" data-import="parts"></div>
      <div class="field"><label for="imp-tpm">นำเข้าใบตรวจ TPM</label><input id="imp-tpm" type="file" accept=".csv,text/csv" data-import="checklists"></div>
      <div class="field"><label for="imp-pm">นำเข้าแผน PM</label><input id="imp-pm" type="file" accept=".csv,text/csv" data-import="pmPlans"></div>
      <div class="field"><label for="imp-wo">นำเข้าใบงานย้อนหลัง (Job Request)</label><input id="imp-wo" type="file" accept=".csv,text/csv" data-import="workOrders"></div>
    </div>
    ${p ? `<div class="notice ${p.errors.length && !p.rows.length ? 'err' : ''}"><b>${{ assets: 'เครื่องจักร', parts: 'อะไหล่', checklists: 'ใบตรวจ TPM', workOrders: 'ใบงานย้อนหลัง', pmPlans: 'แผน PM' }[p.coll]} ${p.rows.length} ${p.coll === 'checklists' ? `ใบ (${p.points} จุดตรวจ)` : p.coll === 'workOrders' ? 'ใบ' : 'รายการ'} พร้อมนำเข้า</b>${p.skipped ? ` ข้าม ${p.skipped} ${p.coll === 'pmPlans' ? 'แผน' : 'ใบ'}ที่มีอยู่แล้ว` : ''}${p.rows.length ? `: ${p.rows.slice(0, 3).map((r) => esc(r.id)).join(', ')}${p.rows.length > 3 ? ' …' : ''}` : ''}
      ${p.errors.length ? `<ul style="margin:var(--space-2xs) 0 0;padding-left:var(--space-md)">${p.errors.slice(0, 5).map((e) => `<li>${esc(e)}</li>`).join('')}${p.errors.length > 5 ? `<li>และอีก ${p.errors.length - 5} แถว</li>` : ''}</ul>` : ''}</div>
      <div class="actions"><button type="button" class="btn solid" data-act="import-go" ${p.rows.length ? '' : 'disabled'}>นำเข้า ${p.rows.length} รายการ</button><button type="button" class="btn" data-act="import-cancel">ยกเลิก</button></div>` : ''}
  </div></section>`;

  const plantBox = `<section class="box"><div class="bar"><h2>ข้อมูลโรงงาน</h2><span class="lamp" style="--c:${live ? 'var(--ok)' : 'var(--run)'}">${live ? 'เชื่อมฐานข้อมูลจริงแล้ว' : 'โหมดตัวอย่าง'}</span></div><div class="pad">
    ${live ? `<form class="stack u-gap-sm" data-form="plant"><div class="field"><label for="p-name">ชื่อโรงงาน / บริษัท</label><input id="p-name" name="plant" value="${esc(state.setup?.plant || '')}" required></div><div class="field"><label for="p-dept">แผนก</label><input id="p-dept" name="dept" value="${esc(state.setup?.dept || '')}"></div><div class="actions"><button class="btn small">บันทึก</button></div></form>
      <p class="hint">โปรเจกต์ Firebase: <span class="mono">${esc(b.projectId)}</span></p>
      ${state.canSeed ? '<div class="actions"><button type="button" class="btn solid" data-act="seed">ใส่ข้อมูลตัวอย่างเพื่อทดลอง</button></div><p class="hint">ฐานข้อมูลยังไม่มีข้อมูล สามารถใส่ข้อมูลตัวอย่างเพื่อทดลองใช้งาน หรือนำเข้าข้อมูลจริงจากไฟล์ Excel</p>' : ''}`
    : `<p class="dim">ข้อมูลขณะนี้จัดเก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้นและไม่มีการเข้าสู่ระบบ ใช้สำหรับทดลองก่อนตั้งค่า Firebase</p>
      <form class="stack u-gap-sm" data-form="config"><div class="field"><label for="s-config">firebaseConfig (ถ้ามีแล้ว)</label>
      <textarea id="s-config" name="config" class="code" rows="6" spellcheck="false" required placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };'>${esc(state.draft.config)}</textarea></div>
      <div class="actions"><button class="btn solid">เชื่อมต่อเครื่องนี้</button><button type="button" class="btn" data-act="reset-demo">รีเซ็ตข้อมูลตัวอย่าง</button></div></form>`}
    ${state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}</div></section>`;

  const backupBox = `<section class="box"><div class="bar"><h2>สำรองข้อมูล</h2></div>
    <div class="pad"><p class="dim">ดาวน์โหลดข้อมูลทั้งหมด ${COLLECTIONS.map((c) => `${state[c].length.toLocaleString()} ${colls[c]}`).join(', ')} เป็นไฟล์ JSON สำหรับเก็บเป็นหลักฐานหรือย้ายระบบ</p>
    <div class="actions"><button type="button" class="btn" data-act="backup">ดาวน์โหลดไฟล์สำรอง</button></div></div></section>`;

  return `${usersBox}<div class="split">${importBox}<div class="w2">${plantBox}${display}${account}${backupBox}</div></div>`;
}

// ชื่อที่แสดง: "โรงงาน / แผนก"
function placeName() {
  const x = state.setup || {};
  return [x.plant, x.dept].filter(Boolean).join(' / ');
}

function authShell(title, body) {
  const plant = placeName();
  return `<div class="login"><div class="authcard">
    <div class="bar" style="display:flex;align-items:center;gap:var(--space-sm)">${brandMark('lm')}<div><b class="authname">CMMS</b>${plant ? `<span class="authplant">${esc(plant)}</span>` : ''}<span class="authtitle">${title}</span></div></div>
    ${body}</div></div>`;
}

/* โลโก้: น็อตหกเหลี่ยม ครึ่งทึบ ครึ่งลายเส้น */
const brandMark = (k) => `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><clipPath id="${k}r"><path d="M32 12.95 L43 12.95 L54 32 L43 51.05 L32 51.05 Z"/></clipPath><mask id="${k}h" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><circle cx="32" cy="32" r="8" fill="#000"/></mask></defs><g transform="translate(32 32) scale(1.18) translate(-32 -32)"><g mask="url(#${k}h)"><path d="M32 12.95 L21 12.95 L10 32 L21 51.05 L32 51.05 Z" fill="currentColor"/><g clip-path="url(#${k}r)"><path d="M-20 64 L32 12" stroke="currentColor" stroke-width="3.4"/><path d="M-13 64 L39 12" stroke="currentColor" stroke-width="3.4"/><path d="M-6 64 L46 12" stroke="currentColor" stroke-width="3.4"/><path d="M1 64 L53 12" stroke="currentColor" stroke-width="3.4"/><path d="M8 64 L60 12" stroke="currentColor" stroke-width="3.4"/><path d="M15 64 L67 12" stroke="currentColor" stroke-width="3.4"/><path d="M22 64 L74 12" stroke="currentColor" stroke-width="3.4"/><path d="M29 64 L81 12" stroke="currentColor" stroke-width="3.4"/><path d="M36 64 L88 12" stroke="currentColor" stroke-width="3.4"/><path d="M43 64 L95 12" stroke="currentColor" stroke-width="3.4"/><path d="M50 64 L102 12" stroke="currentColor" stroke-width="3.4"/><path d="M57 64 L109 12" stroke="currentColor" stroke-width="3.4"/></g><path d="M32 12.95 L43 12.95 L54 32 L43 51.05 L32 51.05 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></g></g></svg>`;

function viewLogin() {
  const err = state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : '';
  const note = state.notice ? `<p class="notice">${esc(state.notice)}</p>` : '';
  const fromFile = !savedConfig();
  return authShell('เข้าสู่ระบบ', `<form class="pad" data-form="login">
    <div class="field"><label for="l-emp">รหัสพนักงาน</label><input id="l-emp" name="empId" autocomplete="username" autocapitalize="characters" spellcheck="false" required value="${esc(state.draft.empId)}"></div>
    <div class="field"><label for="l-pass">รหัสผ่าน</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
    ${err}${note}
    <button class="btn solid u-center">เข้าสู่ระบบ</button>
    <p class="hint u-tc">หากลืมรหัสผ่านหรือยังไม่มีบัญชี กรุณาติดต่อหัวหน้าแผนกซ่อมบำรุง</p>
    ${fromFile ? '' : '<button type="button" class="btn small" style="align-self:center" data-act="disconnect">เลิกเชื่อมต่อเครื่องนี้</button>'}</form>`);
}

// เข้าด้วยรหัสชั่วคราว ต้องตั้งรหัสของตัวเองก่อนใช้งาน
function viewFirstPassword() {
  const err = state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : '';
  return authShell('ตั้งรหัสผ่านใหม่', `<form class="pad" data-form="firstpass">
    <p class="dim">ยินดีต้อนรับ คุณ <b>${esc(state.user.name)}</b> (รหัสพนักงาน <span class="mono">${esc(state.user.empId)}</span>)<br>ท่านเข้าสู่ระบบด้วยรหัสผ่านชั่วคราว กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน</p>
    <div class="field"><label for="f-new">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input id="f-new" name="next" type="password" minlength="8" required autocomplete="new-password"></div>
    <div class="field"><label for="f-new2">ยืนยันรหัสผ่านใหม่</label><input id="f-new2" name="next2" type="password" minlength="8" required autocomplete="new-password"></div>
    ${err}
    <button class="btn solid u-center">บันทึกรหัสผ่าน</button>
    <button type="button" class="btn u-center" data-act="logout">ออกจากระบบ</button></form>`);
}

function viewSetup() {
  const err = state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : '';
  return authShell('ตั้งค่าครั้งแรก', `<form class="pad" data-form="setup">
    <p class="dim">ระบบยังไม่มีผู้ดูแล บัญชีที่สร้างในขั้นตอนนี้จะเป็นผู้ดูแลระบบคนแรก และหน้านี้จะปิดถาวรเมื่อตั้งค่าเสร็จสิ้น</p>
    <div class="field"><label for="s-plant">ชื่อโรงงาน / บริษัท</label><input id="s-plant" name="plant" required placeholder="เช่น Orbray โรงงาน 2" value="${esc(state.draft.plant)}"></div>
    <div class="field"><label for="s-dept">แผนก</label><input id="s-dept" name="dept" placeholder="เช่น ซ่อมบำรุง" value="${esc(state.draft.dept)}"></div>
    <div class="field"><label for="s-name">ชื่อ-นามสกุล</label><input id="s-name" name="name" required autocomplete="name" value="${esc(state.draft.name)}"></div>
    <div class="field"><label for="s-emp">รหัสพนักงานของคุณ (ใช้ล็อกอิน)</label><input id="s-emp" name="empId" required autocomplete="username" autocapitalize="characters" spellcheck="false" placeholder="เช่น M0001" value="${esc(state.draft.empId)}"></div>
    <div class="field"><label for="s-pass">รหัสผ่าน (อย่างน้อย 8 ตัว)</label><input id="s-pass" name="password" type="password" minlength="8" required autocomplete="new-password"></div>
    <div class="field"><label for="s-pass2">ยืนยันรหัสผ่าน</label><input id="s-pass2" name="password2" type="password" minlength="8" required autocomplete="new-password"></div>
    ${err}
    <button class="btn solid u-center">สร้างบัญชีผู้ดูแลระบบ</button></form>`);
}

/* ---------- วาดหน้า ---------- */
function render() {
  if (!state.backend || state.user === undefined) { app.innerHTML = ''; return; }
  if (state.needSetup) { document.body.style.overflow = ''; app.innerHTML = viewSetup(); return; }
  if (!state.user) { document.body.style.overflow = ''; app.innerHTML = viewLogin(); return; }
  if (state.user.mustChange) { document.body.style.overflow = ''; app.innerHTML = viewFirstPassword(); return; }
  const m = metrics();
  const counts = { work: m.open.length, assets: state.assets.length, pm: m.pmSoon.length, parts: m.low.length, gauges: m.gaugeAlert.length || '' };
  const nav = Object.entries(PAGES).map(([k, [, label]]) => `<button type="button" data-act="nav" data-id="${k}" ${state.page === k ? 'aria-current="page"' : ''}>${icon(NAV_ICON[k])}<span>${label}</span><span class="n">${counts[k] ?? ''}</span></button>`).join('');
  const views = { quick: viewQuick, plant: viewPlant, board: viewBoard, work: viewWork, assets: viewAssets, pm: viewPm, parts: viewParts, gauges: viewGauges, report: viewReport, server: viewServer };
  const noRole = !state.user.role;
  const [, , full] = PAGES[state.page];
  const add = canAdmin() && ADD_LABEL[state.page] ? `<button type="button" class="btn" data-act="add" data-id="${state.page}">${ADD_LABEL[state.page]}</button>` : '';
  const tv = state.page === 'board' ? `<button type="button" class="btn" data-act="tv">${icon('<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>')}${state.tv ? 'ออกจากโหมดจอ' : 'โหมดจอทีวี'}</button>` : '';
  const report = noRole || state.page === 'quick' ? '' : `<button type="button" class="btn solid" data-act="report">${icon('<path d="M12 5v14M5 12h14"/>')}แจ้งซ่อม</button>`;
  const role = userLabel(state.user);
  const where = state.backend.mode === 'firebase' ? (placeName() || state.backend.projectId) : 'ข้อมูลตัวอย่างในเครื่องนี้';
  const sync = state.lastSync ? `อัปเดตล่าสุด ${fmtTime(state.lastSync)}` : '';
  app.classList.toggle('quickmode', state.page === 'quick');
  const plantLine = state.backend.mode === 'firebase' ? [state.setup?.plant, state.setup?.dept].filter(Boolean) : ['ข้อมูลตัวอย่าง'];
  app.innerHTML = `<div class="shell">
      <aside class="side">
        <div class="brand" title="${esc(placeName())}">${brandMark('sm')}<span class="bt"><b>CMMS</b>${plantLine.map((x) => `<span>${esc(x)}</span>`).join('')}</span></div>
        <nav class="nav" aria-label="เมนูหลัก">${nav}</nav>
        <div class="me">${avatar(state.user.name, false)}<span class="who"><b>${esc(state.user.name)}</b><span>${esc(role)}</span></span>${state.backend.mode === 'firebase' ? '<button type="button" data-act="logout">ออกจากระบบ</button>' : ''}</div>
      </aside>
      <main>
        <header class="head"><div><h1>${full}</h1><p class="meta"><span>${today()}</span><span>${esc(where)}</span>${sync ? `<span>${sync}</span>` : ''}</p></div>
          <div class="actions">${noRole ? '' : `<div class="searchwrap"><span class="sicon">${icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>')}</span><label for="q" class="sr">ค้นหาเครื่อง ใบงาน อะไหล่ เครื่องมือวัด</label><input id="q" class="search" type="search" autocomplete="off" placeholder="ค้นหาทั้งระบบ" value="${esc(state.q)}"><div id="q-res" class="qres" hidden></div></div>`}${tv}${add}${report}</div></header>
        ${state.backend.mode === 'local' ? `<p class="notice demo">โหมดตัวอย่าง: ข้อมูลจัดเก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้น ${canAdmin() ? '<button type="button" class="link u-sans" data-act="nav" data-id="server">ตั้งค่าเพื่อใช้งานจริง</button>' : ''}</p>` : ''}
        ${noRole ? `<p class="notice err">${state.user.disabled ? 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อหัวหน้าแผนกซ่อมบำรุง' : 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อหัวหน้าแผนกซ่อมบำรุง'}</p>` : ''}
        ${state.loadError && state.page !== 'server' ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}
        <div class="pages" id="pages">${noRole && state.page !== 'server' ? '' : views[state.page](m)}</div>
        <nav class="pgbar" id="pgbar" aria-label="เปลี่ยนหน้า" hidden></nav>
      </main>
    </div>${drawer()}${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ''}`;
  doFit();
}

// หน้าจอเดียวต่อหน้า: ส่วนที่เกินจอแบ่งเป็นหน้าถัดไป (เฉพาะจอกว้าง จอมือถือยังเลื่อนลงตามปกติ)
const fitOn = () => fitWanted() && state.page !== 'quick' && !!state.user;
let lastClick = null;
let searchTimer = 0;
function doFit() {
  const box = document.getElementById('pages'), bar = document.getElementById('pgbar');
  if (!box || !bar) { document.documentElement.classList.remove('fit'); return; }
  let keep = null;
  if (lastClick) {
    keep = [...box.querySelectorAll('[data-act]')].find((e) => e.dataset.act === lastClick.act && e.dataset.id === lastClick.id) || null;
    lastClick = null;
  }
  const key = state.page;
  fit(box, bar, { enabled: fitOn(), page: state.pg[key] || 0, keep, onPage: (p) => { state.pg[key] = p; } });
  tuneRows();
}

// ตารางใหญ่ (งานซ่อม ทะเบียนเครื่อง) แบ่งหน้าเองตามจำนวนแถวที่พอดีจอ แทนการวาดทุกแถวแล้ววัดทีละแถว
let tuning = false;
function tuneRows() {
  if (tuning || !fitOn() || !['work', 'assets'].includes(state.page)) return;
  const key = state.page;
  const find = () => (key === 'work' ? document.querySelector('#wo-body tbody') : document.querySelector('[aria-label="ทะเบียนเครื่องจักร"] tbody'));
  const box = document.getElementById('pages');
  const bar = document.getElementById('pgbar');
  const redo = (n) => { state.fitRows[key] = n; tuning = true; try { render(); } finally { tuning = false; } };
  let body = find();
  if (!box || !body || body.closest('[data-off]')) return;
  const rows = [...body.children].filter((r) => !r.hasAttribute('data-off') && !r.classList.contains('band') && r.getBoundingClientRect().height > 0);
  if (rows.length < 2) return;
  const hs = rows.slice(0, 8).map((r) => r.getBoundingClientRect().height).sort((x, y) => x - y);
  const rowH = hs[Math.floor(hs.length / 2)];
  const pager = body.closest('.box, #wo-body')?.querySelector('.pager');
  const pagerH = pager ? pager.getBoundingClientRect().height + 12 : 52;
  // วัดจากขอบล่างจริงของพื้นที่ (ไม่หักแถบเปลี่ยนหน้า ถ้าตารางพอดีจอแถบนั้นจะหายไปเอง)
  const barH = bar && !bar.hidden ? bar.getBoundingClientRect().height + 16 : 0;
  const room = box.getBoundingClientRect().bottom + barH - body.getBoundingClientRect().top - pagerH - 8;
  let want = Math.max(5, Math.floor(room / rowH));
  if (want === state.fitRows[key]) return;
  redo(want);
  // ถ้ายังล้นจนตารางถูกแบ่งไปหน้าถัดไป ลดทีละแถว
  for (let i = 0; i < 4 && want > 5; i++) {
    body = find();
    const cut = body && [...body.children].some((r) => r.hasAttribute('data-off'));
    const pg = body?.closest('.box, #wo-body')?.querySelector('.pager');
    if (!cut && !(pg && pg.closest('[data-off]'))) break;
    redo(--want);
  }
}
let tvTimer = null;
function tvRotate() {
  clearInterval(tvTimer);
  if (!state.tv) return;
  tvTimer = setInterval(() => { if (state.page === 'board' && fitActive()) { const n = document.querySelectorAll('#pgbar .pg-dot').length; const at = state.pg.board || 0; fitGoto(n && at >= n - 1 ? 0 : at + 1); } }, 20000);
}
let fitTimer;
// ฟอนต์โหลดเสร็จทีหลังทำให้ความสูงเปลี่ยน ต้องจัดหน้าใหม่
document.fonts?.addEventListener?.('loadingdone', () => { if (state.user) doFit(); });
document.fonts?.ready?.then(() => { if (state.user) doFit(); });
window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { if (state.user) refresh(); }, 150); });

// ข้อมูลเรียลไทม์อาจมาตอนคนกำลังพิมพ์หรือกดเมาส์ค้าง จึงพักการวาดใหม่ไว้ก่อน
let pending = false;
let pointerDown = false;
// ข้อมูลหลายชุดมาพร้อมกันตอนเปิดหรือซิงก์ รวมเป็นการวาดครั้งเดียวต่อเฟรม
let refreshQueued = 0;
function refresh() {
  if (refreshQueued) return;
  refreshQueued = requestAnimationFrame(() => { refreshQueued = 0; refreshNow(); });
}
function refreshNow() {
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
  if (code.includes('unavailable') || code.includes('failed-precondition') || code === 'auth/network-request-failed') return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่เมื่อเครือข่ายพร้อมใช้งาน';
  if (code === 'auth/email-already-in-use') return 'รหัสพนักงานนี้มีบัญชีอยู่แล้ว';
  if (code === 'auth/requires-recent-login') return 'กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน';
  if (code === 'auth/weak-password') return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
  if (code === 'auth/invalid-email') return 'รหัสพนักงานไม่ถูกต้อง';
  if (code === 'auth/too-many-requests') return 'ระบุรหัสผ่านผิดหลายครั้ง กรุณารอสักครู่แล้วลองใหม่ หรือติดต่อหัวหน้าแผนกเพื่อรีเซ็ตรหัสผ่าน';
  if (code === 'auth/operation-not-allowed') return 'ยังไม่ได้เปิด Email/Password ใน Firebase console (ระบบใช้เบื้องหลังสำหรับรหัสพนักงาน)';
  if (code.startsWith('auth/')) return 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง';
  return err?.message || 'ทำรายการไม่สำเร็จ';
}

// หน้าโหลด: แสดงตั้งแต่เปิดเว็บและหลังเข้าสู่ระบบ จนข้อมูลเครื่องจักรและใบงานชุดแรกมาถึง
// แสดงอย่างน้อย 0.9 วินาที (ให้เห็นน็อตขันหนึ่งรอบ ไม่กะพริบ) และไม่เกิน 10 วินาที
const boot = { shownAt: performance.now(), wait: null, timer: null };
function bootShow(msg) {
  const el = document.getElementById('boot');
  if (!el) return;
  if (el.hidden || el.classList.contains('out')) boot.shownAt = performance.now();
  el.hidden = false; el.classList.remove('out');
  const m = document.getElementById('boot-msg');
  if (m && msg) m.textContent = msg;
}
function bootHide(now = false) {
  const el = document.getElementById('boot');
  boot.wait = null; clearTimeout(boot.timer);
  if (!el || el.hidden || el.classList.contains('out')) return;
  const left = now ? 0 : Math.max(0, 900 - (performance.now() - boot.shownAt));
  boot.timer = setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => { if (el.classList.contains('out')) el.hidden = true; }, 340);
  }, left);
}
function bootWaitFor(colls) {
  boot.wait = new Set(colls);
  clearTimeout(boot.timer);
  boot.timer = setTimeout(() => bootHide(true), 10000);
}
function bootGot(c) {
  if (!boot.wait) return;
  boot.wait.delete(c);
  if (!boot.wait.size) bootHide();
}

function listen() {
  state.unsubs.forEach((u) => u());
  const usersUnsub = state.backend.subscribeUsers((rows) => { state.users = rows; refresh(); }, (err) => console.warn('อ่านรายชื่อผู้ใช้ไม่ได้', err));
  state.unsubs = COLLECTIONS.map((c) => state.backend.subscribe(c, (rows) => {
    state[c] = c === 'assets' ? rows.sort((a, b) => a.id.localeCompare(b.id)) : (c === 'workOrders' ? rows.sort((a, b) => b.startAt - a.startAt) : rows);
    state.ver++;
    state.loadError = '';
    state.lastSync = Date.now();
    refresh();
    bootGot(c);
  }, (err) => {
    bootGot(c);
    // ใบตรวจ TPM เป็นส่วนเสริม อ่านไม่ได้ (เช่น ยังไม่ได้เผยแพร่กฎใหม่) ก็ใช้งานส่วนอื่นต่อได้
    if (c === 'checklists' || c === 'stockMoves') { console.warn(`อ่าน ${c} ไม่ได้`, err); state[c] = []; refresh(); return; }
    console.error(err); state.loadError = explain(err); refresh();
  }));
  state.unsubs.push(usersUnsub);
  // รูปแผนผังโรงงานเป็นส่วนเสริม อ่านไม่ได้ (ยังไม่ได้เผยแพร่กฎใหม่) ก็ใช้งานส่วนอื่นต่อได้
  state.unsubs.push(state.backend.subscribe('maps', (rows) => { state.maps = rows; state.ver++; refresh(); }, (err) => { console.warn('อ่านแผนผังโรงงานไม่ได้', err); state.maps = []; refresh(); }));
}

function go(page) {
  state.page = PAGES[page] ? page : 'board';
  state.pg[state.page] = 0;
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
window.addEventListener('hashchange', () => { let p = location.hash.slice(1); if (p === 'overview') p = 'board'; if (PAGES[p] && p !== state.page) go(p); });

function addLog(w, text) {
  return [...(w.log || []), { at: Date.now(), text }];
}

/* ---------- การกระทำ ---------- */
const actions = {
  nav: (id) => go(id),
  'ov-range': (id) => { state.ovRange = Number(id); state.ovSel = null; render(); },
  'ov-sel': (id) => { state.ovSel = Number(id); render(); },
  tv: () => {
    const on = !state.tv;
    if (on) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    state.tv = on; document.documentElement.classList.toggle('tv', on); render(); tvRotate();
  },
  filter: (id) => { state.filter = id; render(); },
  'open-wo': (id) => {
    const w = state.workOrders.find((x) => x.id === id);
    if (state.selectedWo !== id) { state.close = { cause: w?.cause || '', action: w?.action || '' }; state.cancelWo = null; }
    if (state.page !== 'work') go('work');
    state.selectedWo = id;
    render();
    document.querySelector('.drawer .iconbtn')?.focus();
  },
  // ยกเลิกจากแถวในตาราง: เปิดใบงานพร้อมช่องใส่เหตุผล
  'wo-cancel-row': (id) => {
    actions['open-wo'](id);
    state.cancelWo = { id, reason: '' };
    render();
    const t = document.getElementById('w-cancel');
    t?.scrollIntoView({ block: 'center' }); t?.focus();
  },
  'close-drawer': () => { const id = state.selectedWo; state.selectedWo = null; render(); document.querySelector(`.trow [data-id="${CSS.escape(id || '')}"].check`)?.focus(); },
  scope: (id) => { state.scope = id; render(); },
  'toggle-group': (id) => { state.collapsed[id] = !state.collapsed[id]; render(); },
  'show-done': () => { state.showDone = true; render(); },
  'wo-view': (id) => { state.woView = id; state.woFilter = false; render(); },
  'wo-filter': () => { state.woFilter = !state.woFilter; render(); },
  'wo-status': (id) => { state.woStatus = id; state.woPage = 0; state.pg.work = 0; state.woFilter = false; render(); document.querySelector('[data-act="wo-filter"]')?.focus(); },
  'wo-expand': (id) => { state.woOpen[id] = !state.woOpen[id]; render(); document.querySelector(`[data-act="wo-expand"][data-id="${CSS.escape(id)}"]`)?.focus(); },
  'wo-page': (id) => { state.woPage = Math.max(0, state.woPage + (id === 'next' ? 1 : -1)); render(); document.querySelector('.wot')?.scrollIntoView({ block: 'nearest' }); },
  'quick-open': () => { state.quick = true; state.collapsed.pending = false; state.draft = { asset: state.assets[0]?.id, priority: 'stop' }; render(); document.getElementById('qa-title')?.focus(); },
  'quick-cancel': () => { state.quick = false; state.draft = {}; render(); },
  'tpm-mark': (v) => {
    const [i, r] = v.split(':');
    const id = state.selectedAsset || state.assets[0]?.id;
    const sel = (state.tpmSel[id] ||= {});
    if (sel[i] === r) delete sel[i]; else sel[i] = r;
    render();
  },
  'tpm-all-ok': (id) => {
    const a = assetOf(id); const cl = checklistOf(a); if (!cl) return;
    const last = state.tpm[id]?.data?.last || {};
    const sel = (state.tpmSel[id] ||= {});
    cl.items.forEach((it, i) => { if (tpmDue(last[i], it.freq) && !sel[i]) sel[i] = 'ok'; });
    render();
  },
  'tpm-save': (id) => {
    const a = assetOf(id); const cl = checklistOf(a); const sel = state.tpmSel[id] || {};
    if (!cl || !Object.keys(sel).length) return;
    const at = Date.now();
    const results = Object.entries(sel).map(([i, r]) => ({ i: Number(i), part: cl.items[i]?.part || '', ok: r === 'ok' }));
    const ng = results.filter((r) => !r.ok);
    run(async () => {
      await state.backend.recordInspection({ asset: id, wi: cl.id, at, by: state.user.name, byUid: state.user.uid || '', results });
      state.tpmSel[id] = {};
      state.tpmNg = ng.length ? { asset: id, items: ng } : null;
      const cur = state.tpm[id]?.data || { last: {} };
      results.forEach((r) => { cur.last[r.i] = at; });
      state.tpm[id] = { status: 'ok', data: { ...cur, lastAt: at, lastBy: state.user.name } };
      render();
    }, `บันทึกผลตรวจ ${results.length} จุดแล้ว${ng.length ? ` ไม่ผ่าน ${ng.length} จุด` : ''}`);
  },
  'pm-year': (d) => { state.pmYear += Number(d); render(); },
  'pm-view': (v) => { state.pmView = v; render(); },
  'pm-month': (d) => {
    const t = new Date(startOfToday());
    const cur = state.pmMonth ? new Date(state.pmMonth) : new Date(t.getFullYear(), t.getMonth(), 1);
    state.pmMonth = Number(d) === 0 ? null : new Date(cur.getFullYear(), cur.getMonth() + Number(d), 1).getTime();
    state.pmDay = null; render();
  },
  'pm-day': (v) => { state.pmDay = v === '' || Number(v) === state.pmDay ? null : Number(v); render(); },
  'cost-year': (d) => { state.costYear += Number(d); render(); },
  'board-all': () => { state.boardAll = !state.boardAll; render(); },
  'af-page': (d) => { state.af.page = Math.max(0, state.af.page + Number(d)); render(); document.querySelector('[aria-label="ทะเบียนเครื่องจักร"]')?.scrollIntoView({ block: 'nearest' }); },
  'tpm-ng-close': () => { state.tpmNg = null; render(); },
  'tpm-report': (id) => {
    const ng = state.tpmNg; if (!ng) return;
    if (state.page !== 'work') go('work');
    state.selectedWo = null;
    state.panel = true;
    const list = ng.items.map((x) => x.part);
    state.create = { title: `ผลตรวจ TPM ไม่ผ่าน: ${list.slice(0, 3).join(', ')}${list.length > 3 ? ` และอีก ${list.length - 3} จุด` : ''}`, type: 'inspect', asset: id, due: '', prio: 'slow', people: [state.user.name], checks: list.map((t) => ({ text: `ตรวจและแก้ไข: ${t}`, done: false })), newCheck: '', note: `พบจากการตรวจ TPM วันที่ ${fmtDate(Date.now())}` };
    state.tpmNg = null;
    render();
    document.getElementById('cp-title')?.focus();
  },
  'open-asset': (id) => { state.selectedAsset = id; if (state.page !== 'assets') go('assets'); else render(); window.scrollTo(0, 0); fitReveal(document.querySelector('#pages .split')); },
  report: () => {
    if (state.page !== 'work') go('work');
    state.selectedWo = null;
    state.panel = true;
    state.create = { title: '', type: 'breakdown', asset: state.assets[0]?.id || '', due: '', prio: 'stop', people: [state.user.name], checks: [{ text: 'ดำเนินการ LOTO ก่อนเริ่มงาน', done: false }], newCheck: '', note: '' };
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
  'wo-hide-cancel': () => {
    state.hideCancelled = !state.hideCancelled;
    try { localStorage.setItem('cmms.hideCancelled', state.hideCancelled ? 'on' : 'off'); } catch { /* ใช้ค่าในหน่วยความจำต่อ */ }
    if (state.hideCancelled && state.woStatus === 'cancelled') state.woStatus = 'all';
    state.woPage = 0; state.pg.work = 0;
    render();
    document.querySelector('[data-act="wo-hide-cancel"]')?.focus();
    toast(state.hideCancelled ? 'ซ่อนงานที่ยกเลิกแล้ว' : 'แสดงงานที่ยกเลิกด้วย');
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
    const rows = state.parts.filter(needsOrder);
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
  'wo-set': (status) => {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    if (!w || !isOpen(w) || !['doing', 'parts'].includes(status)) return;
    const patch = { status };
    const tech = w.tech || state.user.name;
    if (!w.tech) patch.tech = tech;
    patch.log = addLog(w, status === 'parts' ? `${tech} เปลี่ยนสถานะเป็นรออะไหล่` : `${tech} ${w.status === 'parts' ? 'ดำเนินการซ่อมต่อ' : 'เริ่มซ่อม'}`);
    run(() => state.backend.updateWorkOrder(w.id, patch));
  },
  'wo-cancel-open': () => { state.cancelWo = { id: state.selectedWo, reason: '' }; render(); document.getElementById('w-cancel')?.focus(); },
  'wo-cancel-close': () => { state.cancelWo = null; render(); document.querySelector('[data-act="wo-cancel-open"]')?.focus(); },
  'wo-cancel-go': () => {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    const reason = (state.cancelWo?.reason || '').trim();
    if (!w || !reason || !canCancel(w)) return;
    const me = state.user.name, now = Date.now();
    const used = (w.partsUsed || []).filter((u) => u.qty > 0);
    run(async () => {
      // คืนอะไหล่ที่เบิกเข้าใบงานกลับเข้าคลัง (บันทึกในประวัติรับเข้า-เบิกออกพร้อมเลขที่ใบงาน)
      for (const u of used) await state.backend.moveStock({ part: u.id, dir: 'in', qty: u.qty, ref: w.id, note: 'คืนจากใบงานที่ยกเลิก', by: me });
      const text = `${me} ยกเลิกใบงาน: ${reason}${used.length ? ` (คืนอะไหล่ ${used.map((u) => `${u.id} x${u.qty}`).join(', ')})` : ''}`;
      await state.backend.updateWorkOrder(w.id, { status: 'cancelled', endAt: now, cancelledBy: me, cancelReason: reason, log: addLog(w, text) });
      state.cancelWo = null;
    }, `ยกเลิก ${w.id} แล้ว`);
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
  'pm-done': (id) => run(() => state.backend.completePM(id, state.user.name), 'บันทึกเรียบร้อย ระบบเลื่อนรอบถัดไปให้แล้ว'),
  'stock-open': (v) => { const [id, dir] = v.split(':'); state.stock = { id, dir }; render(); window.scrollTo(0, 0); document.getElementById('s-qty')?.focus(); },
  'stock-close': () => { state.stock = null; render(); },
  part: (id, el) => run(() => state.backend.adjustPart(id, Number(el.dataset.delta))),
  'map-tab': (id) => { state.mapId = id; state.mapSel = null; state.mapEdit = state.mapEdit && id !== LOOSE; savePref('cmms.mapId', id); render(); },
  'map-add': () => { state.mapAdding = !state.mapAdding; state.mapNewName = ''; render(); if (state.mapAdding) document.getElementById('map-name')?.focus(); },
  'map-edit': () => { state.mapEdit = !state.mapEdit; state.mapSel = null; state.mapQ = ''; render(); },
  'map-pick': (id) => { if (mapDragged) return; state.mapSel = state.mapSel === id ? null : id; render(); },
  'map-labels': () => { state.mapLabels = !state.mapLabels; render(); },
  'map-unplace': (id) => { const a = assetOf(id); if (!a) return; Object.assign(a, { mapId: null, mapX: null, mapY: null }); state.ver++; run(() => state.backend.update('assets', id, { mapId: null, mapX: null, mapY: null }), `เอา ${id} ออกจากแผนผังแล้ว`); render(); },
  'map-export': () => {
    const rows = [...state.assets].sort((a, b) => lineOf(a).localeCompare(lineOf(b)) || a.id.localeCompare(b.id))
      .map((a) => [a.id, a.name, a.line || '', placed(a) ? mapName(mapById(a.mapId)) : '', placed(a) ? (a.mapX * 100).toFixed(2) : '', placed(a) ? (a.mapY * 100).toFixed(2) : '']);
    download(`cmms-map-positions-${isoDate(Date.now())}.csv`, csv([['id', 'name', 'line', 'map', 'map_x', 'map_y'], ...rows]));
  },
  'map-del': (id, el) => {
    const mp = mapById(state.mapId); if (!mp) return;
    if (!el.dataset.confirm) { el.dataset.confirm = '1'; el.textContent = `กดอีกครั้งเพื่อลบแผนผัง ${mapName(mp)}`; return; }
    state.mapEdit = false;
    run(() => state.backend.remove('maps', mp.id), 'ลบแผนผังแล้ว ตำแหน่งเครื่องยังเก็บไว้ เพิ่มแผนผังชื่อเดิมด้วยรูปสัดส่วนเดิมจะกลับมาแสดงตำแหน่งเดิม');
  },
  del: (id, el) => {
    if (el.dataset.confirm) return run(() => state.backend.remove(el.dataset.coll, id), 'ลบแล้ว');
    el.dataset.confirm = '1';
    el.textContent = 'กดอีกครั้งเพื่อยืนยัน';
  },
  seed: () => run(async () => { await state.backend.seed(); state.canSeed = false; }, 'ใส่ข้อมูลตัวอย่างแล้ว'),
  'reset-demo': () => { state.backend.reset(); toast('รีเซ็ตแล้ว'); },
  disconnect: () => { clearConfig(); location.reload(); },
  logout: () => run(() => state.backend.signOut()),
  'delete-user': (id, el) => {
    const u = state.users.find((x) => x.id === id);
    if (!u) return;
    if (!el.dataset.confirm) { el.dataset.confirm = '1'; el.textContent = 'กดอีกครั้งเพื่อลบ'; return; }
    el.disabled = true;
    run(() => state.backend.deleteUser(id), `ลบบัญชีของ ${u.name} แล้ว`);
  },
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
    navigator.clipboard?.writeText(`รหัสพนักงาน ${x.empId} รหัสผ่านชั่วคราว ${x.temp}`).then(() => toast('คัดลอกแล้ว'), () => toast('คัดลอกไม่สำเร็จ กรุณาจดจากหน้าจอ'));
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
  // แผนผังโรงงาน: คลิกบนรูปเพื่อวางเครื่องที่เลือก
  if (mapDragged && e.target.closest('.fmap')) return;
  const fm = e.target.closest('.fmap.editing');
  if (fm && !e.target.closest('.pin')) { mapPlace(fm, e); return; }
  const pg = e.target.closest('[data-pg]');
  if (pg && !pg.disabled) { fitGoto(Number(pg.dataset.pg)); return; }
  const el = e.target.closest('[data-act]');
  if (el && el.closest('#pages')) lastClick = { act: el.dataset.act, id: el.dataset.id };
  if (state.q && (!e.target.closest('.searchwrap') || el?.closest('.qres'))) { state.q = ''; const i = document.getElementById('q'); if (i) i.value = ''; paintSearch(); }
  if (state.woFilter && !e.target.closest('.wofilter')) { state.woFilter = false; if (!el) { render(); return; } }
  if (!el || el.disabled) return;
  actions[el.dataset.act]?.(el.dataset.id, el);
});

// ลากจุดเพื่อย้ายตำแหน่ง (โหมดจัดตำแหน่ง)
let mapDrag = null, mapDragged = false;
const mapXY = (fm, e) => { const r = fm.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
function saveSpot(id, x, y) {
  const a = assetOf(id); if (!a) return;
  const mapX = Math.round(x * 10000) / 10000, mapY = Math.round(y * 10000) / 10000;
  const mapId = state.mapId;
  Object.assign(a, { mapId, mapX, mapY }); state.ver++;
  run(() => state.backend.update('assets', id, { mapId, mapX, mapY }));
}
function mapPlace(fm, e) {
  if (!state.mapSel) { toast('เลือกเครื่องจากรายการทางขวาก่อน แล้วคลิกบนแผนผัง'); return; }
  const wasLoose = !placed(assetOf(state.mapSel) || {});
  const [x, y] = mapXY(fm, e);
  saveSpot(state.mapSel, x, y);
  // วางเครื่องใหม่แล้วเลือกเครื่องถัดไปที่ยังไม่ได้วางให้เลย จะได้คลิกต่อได้ทันที
  if (wasLoose) {
    const q = (state.mapQ || '').trim().toLowerCase();
    const fl = state.mapFilter;
    const next = state.assets.filter((a) => (!fl || lineOf(a) === fl) && !placed(a) && (!q || `${a.id} ${a.name} ${a.area || ''}`.toLowerCase().includes(q))).sort((a, b) => a.id.localeCompare(b.id))[0];
    state.mapSel = next ? next.id : null;
  }
  render();
}
app.addEventListener('pointerdown', (e) => {
  const p = e.target.closest('.fmap.editing .pin');
  if (!p || e.button !== 0) return;
  mapDrag = { id: p.dataset.id, x0: e.clientX, y0: e.clientY, moved: false };
  p.setPointerCapture?.(e.pointerId);
});
app.addEventListener('pointermove', (e) => {
  if (!mapDrag) return;
  if (!mapDrag.moved && Math.hypot(e.clientX - mapDrag.x0, e.clientY - mapDrag.y0) < 4) return;
  mapDrag.moved = true;
  const fm = app.querySelector('.fmap.editing'); const p = fm?.querySelector(`.pin[data-id="${CSS.escape(mapDrag.id)}"]`);
  if (!fm || !p) return;
  const [x, y] = mapXY(fm, e); p.style.left = `${x * 100}%`; p.style.top = `${y * 100}%`; p.classList.add('drag');
});
app.addEventListener('pointerup', (e) => {
  if (!mapDrag) return;
  const d = mapDrag; mapDrag = null;
  if (!d.moved) return;
  mapDragged = true; setTimeout(() => { mapDragged = false; }, 0);
  const fm = app.querySelector('.fmap.editing'); if (!fm) return;
  const [x, y] = mapXY(fm, e); state.mapSel = d.id; saveSpot(d.id, x, y); render();
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
  if (fitActive() && !e.altKey && !e.ctrlKey && !e.metaKey && !document.querySelector('[aria-modal="true"]') && !e.target.closest?.('input, textarea, select, [contenteditable]')) {
    const d = { PageDown: 1, PageUp: -1, ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d && !(e.key.startsWith('Arrow') && e.target.closest?.('.scroll, [role="tablist"], [role="radiogroup"]'))) { e.preventDefault(); fitStep(d); return; }
  } else if (fitOn() && ['work', 'assets'].includes(state.page) && !e.altKey && !e.ctrlKey && !e.metaKey && !document.querySelector('[aria-modal="true"]') && !e.target.closest?.('input, textarea, select, [contenteditable]')) {
    const d = { PageDown: 1, PageUp: -1 }[e.key];
    const btn = d && document.querySelector(state.page === 'work' ? `#pages [data-act="wo-page"][data-id="${d > 0 ? 'next' : 'prev'}"]` : `#pages [data-act="af-page"][data-id="${d}"]`);
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); return; }
  }
  if (e.key === 'Escape' && state.woFilter) { state.woFilter = false; render(); document.querySelector('[data-act="wo-filter"]')?.focus(); return; }
  if (e.key === 'Escape' && state.panel && !state.q) { actions['panel-close'](); return; }
  if (e.key === 'Escape' && state.selectedWo && state.page === 'work' && !state.q) { actions['close-drawer'](); return; }
  if (e.key === 'Escape' && state.q) { state.q = ''; const i = document.getElementById('q'); if (i) i.value = ''; paintSearch(); }
});

app.addEventListener('input', (e) => {
  if (e.target.id === 'q') { state.q = e.target.value; paintSearch(); return; }
  // ค้นหา: รอให้หยุดพิมพ์สักครู่ค่อยวาดใหม่ ไม่วาดทุกตัวอักษร
  if (e.target.id === 'af-q') {
    state.af.q = e.target.value; state.af.page = 0; state.pg.assets = 0;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { const el0 = document.getElementById('af-q'); const pos = el0?.selectionStart ?? state.af.q.length; render(); const el = document.getElementById('af-q'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }, 200);
    return;
  }
  if (e.target.id === 'map-name') { state.mapNewName = e.target.value; return; }
  if (e.target.id === 'map-q') {
    state.mapQ = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { const pos = document.getElementById('map-q')?.selectionStart ?? state.mapQ.length; render(); const el = document.getElementById('map-q'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }, 200);
    return;
  }
  if (e.target.id === 'wo-q') {
    state.woQ = e.target.value; state.woPage = 0; state.pg.work = 0;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { const b = document.getElementById('wo-body'); if (b) { b.innerHTML = woTable(); doFit(); tuneRows(); } }, 200);
    return;
  }
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
    if (hint) { hint.textContent = ready ? (state.create.people.length ? `มอบหมาย ${state.create.people.length} คน` : 'ยังไม่ได้มอบหมาย งานจะเข้าสู่คิวงานรวม') : 'กรุณาระบุชื่องานและเลือกเครื่องจักรก่อนสร้างงาน'; hint.style.color = ready ? '' : 'var(--stop-fg)'; }
    return;
  }
  if (e.target.hasAttribute('data-cancel') && state.cancelWo) {
    state.cancelWo.reason = e.target.value;
    const b = app.querySelector('[data-act="wo-cancel-go"]');
    if (b) b.disabled = !e.target.value.trim();
    return;
  }
  const key = e.target.dataset.close;
  if (!key) return;
  state.close[key] = e.target.value;
  const btn = app.querySelector('[data-act="wo-close"]');
  const ready = state.close.cause && state.close.action.trim();
  if (btn) btn.disabled = !ready;
  const hint = btn?.closest('.pad')?.querySelector('.hint');
  if (hint) hint.textContent = ready ? 'เมื่อปิดงาน ระบบจะบันทึกเวลาและเพิ่มลงในประวัติเครื่องจักร' : 'กรุณาเลือกรหัสสาเหตุและระบุการแก้ไขที่ต้นเหตุก่อนปิดงาน';
});

app.addEventListener('keydown', (e) => {
  if (e.target.id === 'cp-new' && e.key === 'Enter') { e.preventDefault(); actions['c-add'](); }
});

app.addEventListener('change', (e) => {
  if (e.target.hasAttribute('data-pgsel')) { fitGoto(Number(e.target.value)); document.getElementById('pg-sel')?.focus(); return; }
  if (e.target.dataset.pref === 'fit') { setFitPref(e.target.checked); render(); toast(e.target.checked ? 'จัดหน้าให้พอดีหนึ่งจอแล้ว' : 'กลับไปแสดงแบบเลื่อนยาว'); return; }
  if (e.target.dataset.import && e.target.files?.[0]) {
    const coll = e.target.dataset.import;
    e.target.files[0].text().then((text) => {
      try { state.importPreview = importRows(coll, text); } catch (err) { state.importPreview = null; toast(err.message); }
      render();
    });
    return;
  }
  if (e.target.dataset.af) { state.af[e.target.dataset.af] = e.target.value; state.af.page = 0; state.pg.assets = 0; render(); return; }
  if (e.target.dataset.userRole) {
    const uid = e.target.dataset.userRole;
    const v = e.target.value;
    const patch = v === 'disabled' ? { role: 'disabled' } : { role: POSITIONS[v][1], position: v };
    run(() => state.backend.updateUser(uid, patch), `เปลี่ยนตำแหน่งเป็น ${v === 'disabled' ? ROLE_LABEL.disabled : POSITIONS[v][0]} แล้ว`);
    return;
  }
  if (e.target.id === 'map-filter') { state.mapFilter = e.target.value; render(); return; }
  if ((e.target.id === 'map-file' || e.target.id === 'map-file-new') && e.target.files?.[0]) {
    const file = e.target.files[0];
    const old = e.target.id === 'map-file' ? mapById(state.mapId) : null;
    const name = old ? mapName(old) : (document.getElementById('map-name')?.value || '').trim() || file.name.replace(/\.[^.]+$/, '');
    const id = old ? old.id : mapDocId(name);
    if (!old && mapById(id)) { toast(`มีแผนผังชื่อ ${name} แล้ว เลือกแผนผังนั้นแล้วกด "เปลี่ยนรูป" แทน`); e.target.value = ''; return; }
    const order = old ? old.order ?? 99 : state.maps.length;
    state.mapBusy = true; state.mapAdding = false; render();
    floorImage(file)
      .then(({ img, w, h }) => run(async () => { await state.backend.put('maps', id, { name, img, w, h, order, updatedAt: Date.now(), by: state.user?.name || '' }); state.mapId = id; savePref('cmms.mapId', id); }, `บันทึกแผนผัง ${name} แล้ว`))
      .catch((err) => { console.error(err); toast(err.message || 'อ่านไฟล์แผนผังไม่ได้'); })
      .finally(() => { state.mapBusy = false; render(); });
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
  if (e.target.dataset.cost) {
    const w = state.workOrders.find((x) => x.id === state.selectedWo);
    const k = e.target.dataset.cost;
    const v = k === 'cost' ? (e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0)) : e.target.value.trim();
    if (w && (w[k] ?? (k === 'cost' ? null : '')) !== v) {
      const txt = k === 'cost' ? `บันทึกค่าใช้จ่าย ${v == null ? '—' : `${baht(v)} บาท`}` : k === 'prNo' ? `บันทึกเลขที่ PR ${v || '—'}` : 'แก้ไขรายละเอียดค่าใช้จ่าย';
      run(() => state.backend.updateWorkOrder(w.id, { [k]: v, log: addLog(w, txt) }));
    }
    return;
  }
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
      const id = await state.backend.createWorkOrder({ asset: d.asset, title, type, priority: d.priority, requestedBy: me, requestedUid: state.user.uid, status: 'pending', log: [{ at: Date.now(), text: `${me} ${type === 'breakdown' ? 'แจ้งซ่อม' : 'แจ้งตรวจสอบ'}` }] });
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
        asset: q.asset, title, type, priority: q.stopped ? 'stop' : 'slow', requestedBy: me, requestedUid: state.user.uid, status: 'pending',
        note: q.note.trim(), photo: q.photo || '',
        log: [{ at: Date.now(), text: `${me} แจ้งซ่อมด่วน${q.stopped ? ' เครื่องหยุด' : ''}${q.photo ? ' พร้อมรูป' : ''}` }]
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
        asset: c.asset, title, type: c.type, priority: c.prio, requestedBy: me, requestedUid: state.user.uid, status: 'pending',
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
      const id = await state.backend.createWorkOrder({ asset: d.asset, title, type, priority: d.priority, requestedBy: me, requestedUid: state.user.uid, status: 'pending', log: [{ at: Date.now(), text: `${me} ${type === 'breakdown' ? 'แจ้งซ่อม' : 'แจ้งตรวจสอบ'}` }] });
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
    stock: () => run(async () => {
      const qty = Math.floor(Number(d.qty));
      if (!(qty > 0)) throw new Error('จำนวนต้องมากกว่า 0');
      const st = state.stock; if (!st) return;
      const ref = (d.ref || '').trim(); if (!ref) throw new Error('กรุณาใส่เลขที่อ้างอิง');
      await state.backend.moveStock({ part: st.id, dir: st.dir, qty, ref, note: (d.note || '').trim(), by: state.user.name });
      state.stock = null; render();
      toast(`${st.dir === 'in' ? 'รับเข้า' : 'เบิกออก'} ${st.id} จำนวน ${qty} แล้ว`);
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
        state.justLoggedIn = true;
        bootShow('กำลังเข้าสู่ระบบ');
        await state.backend.signIn(d.empId, d.password);
        state.draft = {};
      } catch (err) {
        bootHide(true);
        state.justLoggedIn = false;
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
        state.justSetup = true;
        state.draft = {};
        await state.backend.refreshUser();
      } catch (err) {
        state.loadError = err?.code?.includes('permission-denied')
          ? 'ฐานข้อมูลปฏิเสธการสร้างบัญชี (permission-denied) กรุณาปิดแท็บ CMMS อื่นทั้งหมด กด Ctrl+F5 แล้วลองใหม่ หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบพร้อมภาพหน้าจอนี้'
          : `${explain(err)}${err?.code ? ` (${err.code})` : ''}`;
        render();
      }
    },
    user: () => run(async () => {
      const empId = d.empId.trim().toUpperCase();
      if (state.users.some((u) => u.empId === empId)) throw new Error(`มีรหัสพนักงาน ${empId} อยู่แล้ว`);
      const name = d.name.trim();
      const pos = POSITIONS[d.position] ? d.position : 'document';
      const temp = await state.backend.createUser({ name, empId, role: POSITIONS[pos][1], position: pos });
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
  // เปิดเว็บทุกครั้งเริ่มที่แดชบอร์ด
  state.page = 'board';
  history.replaceState(null, '', '#board');
  render();
  try {
    state.backend = await createBackend();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="login"><form><div class="bar"><b>เชื่อม Firebase ไม่สำเร็จ</b></div><div class="pad"><p class="notice err">${esc(err.message)}</p><button type="button" class="btn" id="fallback">กลับไปใช้ข้อมูลตัวอย่าง</button></div></form></div>`;
    document.getElementById('fallback').onclick = () => { clearConfig(); location.reload(); };
    bootHide(true);
    return;
  }
  try {
    state.setup = await state.backend.getSetup();
    state.needSetup = state.backend.mode === 'firebase' && !state.setup;
  } catch (err) {
    console.error(err);
    state.loadError = err?.code?.includes('permission-denied') ? 'ยังไม่ได้ตั้งค่ากฎความปลอดภัย (firestore.rules) ใน Firebase console' : explain(err);
  }
  state.backend.onAuth(async (user) => {
    if (user && state.needSetup) { bootHide(true); return; }
    state.user = user;
    state.unsubs.forEach((u) => u());
    state.unsubs = [];
    state.loadError = '';
    if (user?.role && !user.mustChange) {
      bootShow(`ยินดีต้อนรับ ${user.name}`);
      bootWaitFor(['assets', 'workOrders']);
      listen();
      if (user.role === 'admin') {
        try { state.canSeed = await state.backend.isEmpty(); } catch { state.canSeed = false; }
      }
      // เข้าสู่ระบบหรือเปิดเว็บใหม่เริ่มที่แดชบอร์ด ยกเว้นหลังตั้งค่าครั้งแรกซึ่งต้องนำเข้าข้อมูลก่อน
      if (state.justSetup && state.canSeed) state.page = 'server';
      else if (state.justLoggedIn) { state.page = 'board'; history.replaceState(null, '', '#board'); }
      state.justSetup = false; state.justLoggedIn = false;
    } else if (user && !user.mustChange) {
      state.page = 'server';
    }
    render();
    if (!(user?.role && !user.mustChange)) bootHide(true);
  });
  setInterval(() => refresh(), 60000);
})();
