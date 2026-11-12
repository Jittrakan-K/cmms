import { createBackend, parseConfig, saveConfig, clearConfig, startOfToday, COLLECTIONS } from './backend.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const app = document.getElementById('app');

const STATUS = {
  pending: ['รออนุมัติ', '#ffffff', '2px solid var(--ink)'],
  open: ['รอเริ่มงาน', 'var(--ink)', '0'],
  doing: ['กำลังซ่อม', 'var(--stop)', '0'],
  parts: ['รออะไหล่', 'var(--wait)', '0'],
  done: ['ปิดงานแล้ว', 'var(--run)', '0']
};
const TYPE = { breakdown: 'ซ่อมฉุกเฉิน', pm: 'บำรุงรักษาตามแผน', inspect: 'แจ้งตรวจสอบ' };
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
  overview: ['SH-01', 'ภาพรวม', 'ภาพรวมโรงงาน'],
  work: ['SH-02', 'ใบสั่งงาน', 'ใบสั่งงาน'],
  assets: ['SH-03', 'เครื่องจักร', 'ทะเบียนเครื่องจักร'],
  pm: ['SH-04', 'แผน PM', 'แผนบำรุงรักษา'],
  parts: ['SH-05', 'อะไหล่', 'คลังอะไหล่'],
  gauges: ['SH-06', 'เครื่องมือวัด', 'ทะเบียนเครื่องมือวัด'],
  report: ['SH-07', 'รายงาน KPI', 'รายงาน KPI'],
  server: ['SH-08', 'เชื่อมต่อเซิร์ฟเวอร์', 'เชื่อมต่อเซิร์ฟเวอร์']
};
const ADD_LABEL = { assets: 'เพิ่มเครื่อง', pm: 'เพิ่มแผน PM', parts: 'เพิ่มอะไหล่', gauges: 'เพิ่มเครื่องมือวัด' };
const REV = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const state = {
  backend: null, user: undefined, loadError: '', lastSync: null,
  assets: [], workOrders: [], pmPlans: [], parts: [], gauges: [],
  page: 'overview', filter: 'active', selectedWo: null, selectedAsset: null, period: 30, q: '',
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
  if (g.dueDate < t0) return ['late', 'เลยกำหนด', '#fff', '2px solid var(--stop)'];
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
    .filter((w) => w.asset === assetId && w.type !== 'inspect')
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
function titleBlock(rows) {
  return `<div class="tblock">${rows.map(([k, v, mono]) => `<div><span>${esc(k)}</span><span class="${mono ? 'mono' : ''}">${esc(v)}</span></div>`).join('')}</div>`;
}
function sheetBlock(n) {
  const [code, , full] = PAGES[state.page];
  const b = state.backend;
  return titleBlock([
    ['โรงงาน', b.mode === 'firebase' ? b.projectId : 'ข้อมูลตัวอย่าง'],
    ['แผ่นงาน', full], ['เลขที่', `CMMS-${code}`, true], ['แผ่นที่', `${n} / ${Object.keys(PAGES).length}`, true],
    ['ข้อมูล', b.mode === 'firebase' ? 'Firebase' : 'เบราว์เซอร์เครื่องนี้'],
    ['ซิงก์ล่าสุด', state.lastSync ? fmtSec(state.lastSync) : '—', true]
  ]);
}

/* ---------- SH-01 ภาพรวม ---------- */
function viewOverview(m) {
  const span = 7 * DAY;
  const pct = (t) => (((t - m.from) / span) * 100).toFixed(2);
  const days = Array.from({ length: 7 }, (_, i) => `<span>${fmtDate(m.from + i * DAY)}</span>`).join('');
  const rows = state.assets.map((a) => {
    const spans = state.workOrders
      .filter((w) => w.asset === a.id && w.type !== 'inspect' && (w.endAt ?? m.now) >= m.from)
      .map((w) => {
        const a0 = Math.max(w.startAt, m.from), a1 = w.endAt ?? m.now;
        const style = w.type === 'pm' ? '--c:#fff;--b:2px solid var(--accent)' : `--c:${w.status === 'parts' ? 'var(--wait)' : 'var(--stop)'}`;
        const label = esc(`${w.id} ${w.title} ${hours(a1 - w.startAt)} ชม.`);
        return `<button type="button" data-act="open-wo" data-id="${esc(w.id)}" aria-label="${label}" title="${label}" style="left:${pct(a0)}%;width:${(((a1 - a0) / span) * 100).toFixed(2)}%;${style}"></button>`;
      }).join('');
    const d = mergedDown(a.id, m.from, m.now);
    return `<div class="tl-row">
      <button type="button" class="tl-name" data-act="open-asset" data-id="${esc(a.id)}">${tag(a.id)}<span class="nm">${esc(a.name)}</span></button>
      <div class="track"><div class="base" style="width:${pct(m.now)}%"></div>${spans}<div class="now" style="left:${pct(m.now)}%"></div></div>
      <span class="tl-sum ${d ? '' : 'dim'}">${d ? hours(d) : '0'}</span></div>`;
  }).join('');
  const openRows = m.open.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}">
      <td><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.id)}</button></td>
      <td>${tag(w.asset)}</td>
      <td>${esc(w.title)}<span class="sub">${esc(w.tech || 'ยังไม่มอบหมาย')} · ${TYPE[w.type]}</span></td>
      <td class="mono">${hm(m.now - w.startAt)}</td><td>${lamp(w.status)}</td></tr>`).join('');
  const t0 = startOfToday();
  const pmRows = [...m.pmSoon].sort((a, b) => a.dueDate - b.dueDate).map((p) => `<div class="list-row">
      <span class="mono ${p.dueDate < t0 ? 'alarm' : ''}">${fmtDate(p.dueDate)}</span>
      <span class="t"><span>${esc(p.task)}</span><span class="s">${esc(p.asset)} · ทุก ${p.intervalDays} วัน</span></span><span></span></div>`).join('') || '<p class="empty">ไม่มี PM ครบกำหนดใน 7 วัน</p>';
  const lowRows = m.low.map((p) => `<div class="list-row" style="grid-template-columns:minmax(0,1fr) auto">
      <span class="t"><span>${esc(p.name)}</span><span class="s">${esc(p.id)}</span></span>
      <span class="mono ${p.qty === 0 ? 'alarm' : ''}">${p.qty} / ${p.min}</span></div>`).join('') || '<p class="empty">สต็อกอยู่เหนือจุดสั่งซื้อทุกรายการ</p>';
  return `<section class="stats" aria-label="ตัวเลขสำคัญ">
      <div class="stat"><span class="label">เครื่องหยุดตอนนี้</span><span class="fig ${m.stopped.length ? 'alarm' : ''}">${m.stopped.length}<small> / ${state.assets.length}</small></span><span class="cap">${esc(m.stopped.join(', ') || 'ทุกเครื่องเดินปกติ')}</span></div>
      <div class="stat"><span class="label">Availability 7 วัน</span><span class="fig">${m.avail.toFixed(1)}<small>%</small></span><span class="cap">รวมเวลาหยุด ${hours(m.down)} ชม.</span></div>
      <div class="stat"><span class="label">MTBF</span><span class="fig">${hours(m.mtbf)}<small> ชม.</small></span><span class="cap">เครื่องเสีย ${m.fails} ครั้งใน 7 วัน</span></div>
      <div class="stat"><span class="label">MTTR</span><span class="fig">${hours(m.mttr)}<small> ชม.</small></span><span class="cap">จากงานซ่อมที่ปิดแล้ว ${m.closed} ใบ</span></div>
    </section>
    <section class="box">
      <div class="bar"><h2>แผนภูมิสถานะเครื่อง 7 วัน</h2>
        <div class="legend"><span><i class="bar" style="--c:var(--run)"></i>เดินเครื่อง</span><span><i style="--c:var(--stop)"></i>หยุดเสีย</span><span><i style="--c:var(--wait)"></i>รออะไหล่</span><span><i style="--c:#fff;--b:2px solid var(--accent)"></i>PM ตามแผน</span></div></div>
      <div class="scroll"><div class="tl">
        <div class="tl-row top"><span>เครื่อง</span><div class="tl-days">${days}</div><span class="num">หยุด (ชม.)</span></div>
        ${rows || '<p class="empty">ยังไม่มีเครื่องจักร</p>'}
        <div class="tl-row foot"><span></span><span class="mono dim num" style="font-size:11px">เส้นประ = ปัจจุบัน ${fmtTime(m.now)}</span><span class="tl-sum" style="font-weight:500">${hours(m.down)}</span></div>
      </div></div>
    </section>
    <div class="split">
      <section class="box w3" style="gap:0"><div class="bar"><h2>ใบสั่งงานที่เปิดอยู่</h2><button type="button" class="link" style="font-family:var(--sans)" data-act="nav" data-id="work">ดูทั้งหมด</button></div>
        ${openRows ? `<div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">เลขที่</th><th scope="col">เครื่อง</th><th scope="col">อาการ</th><th scope="col">เปิดมา</th><th scope="col">สถานะ</th></tr></thead><tbody>${openRows}</tbody></table></div>` : '<p class="empty">ไม่มีงานค้าง</p>'}</section>
      <div class="w2">
        <section class="box"><div class="bar"><h2>PM ครบกำหนด 7 วัน</h2>${m.pmLate.length ? `<span class="alarm" style="font-size:13px">เลยกำหนด ${m.pmLate.length}</span>` : ''}</div>${pmRows}</section>
        <section class="box"><div class="bar"><h2>อะไหล่ถึงจุดสั่งซื้อ</h2></div>${lowRows}</section>
        <section class="box"><div class="bar"><h2>เครื่องมือวัดที่ต้องดู</h2><button type="button" class="link" style="font-family:var(--sans)" data-act="nav" data-id="gauges">ทะเบียน</button></div>
          ${m.gaugeAlert.map((g) => { const [, label, c, b] = gaugeState(g); return `<div class="list-row" style="grid-template-columns:minmax(0,1fr) auto"><span class="t"><span>${esc(g.name)}</span><span class="s">${esc(g.id)} · ครบ ${fmtDate(g.dueDate)}</span></span><span class="lamp" style="--c:${c};--b:${b}">${label}</span></div>`; }).join('') || '<p class="empty">ทุกเครื่องมืออยู่ในรอบสอบเทียบ</p>'}</section>
      </div>
    </div>`;
}

/* ---------- SH-02 ใบสั่งงาน ---------- */
function formWorkOrder() {
  const d = state.draft;
  const opts = state.assets.map((a) => `<option value="${esc(a.id)}" ${d.asset === a.id ? 'selected' : ''}>${esc(a.id)} ${esc(a.name)}</option>`).join('');
  const pri = [['stop', 'เครื่องหยุด'], ['slow', 'เดินได้แต่ผิดปกติ'], ['plan', 'ซ่อมตามแผนได้']];
  return `<form class="box" data-form="wo"><div class="bar"><h2>แจ้งซ่อมใหม่</h2></div>
    <div class="pad"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px 16px">
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
      <div class="field" style="flex:1 1 220px;min-width:0"><label for="i-part">อะไหล่</label><select id="i-part" name="part" required style="width:100%;min-width:0">${state.parts.map((p) => `<option value="${esc(p.id)}" ${p.qty ? '' : 'disabled'}>${esc(p.id)} ${esc(p.name)} (คงเหลือ ${p.qty})</option>`).join('')}</select></div>
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
    <div class="head" style="border:0;padding:0"><div><span class="doc">${esc(w.id)} · ${TYPE[w.type]}</span><h2 style="font-size:20px;line-height:28px">${esc(w.title)}</h2></div>
      <span class="btn" style="cursor:default;border-width:1.5px">${lamp(w.status)}</span></div>
    <div class="steps">${steps}</div>
    <div class="split">
      <div class="w3">
        <section class="box"><div class="bar"><h2>ข้อมูลงาน</h2></div>
          <dl class="facts">
            <div><dt>เครื่อง</dt><dd><button type="button" class="link" data-act="open-asset" data-id="${esc(w.asset)}">${esc(w.asset)}</button> ${esc(a?.name)}</dd></div>
            <div><dt>ตำแหน่ง</dt><dd>${esc(a?.line || '—')}</dd></div>
            <div><dt>ระดับเครื่อง</dt><dd>${esc(a?.cls || '—')}</dd></div>
            <div><dt>เครื่องหยุด</dt><dd class="mono">${w.type === 'inspect' ? 'ไม่หยุด' : `${hm((w.endAt ?? now) - w.startAt)} ชม.`}</dd></div>
          </dl></section>
        <section class="box"><div class="bar"><h2>บันทึกการเปลี่ยนแปลง</h2></div>
          <table><thead><tr><th scope="col" style="width:48px">REV</th><th scope="col" style="width:140px">เวลา</th><th scope="col">รายการ</th></tr></thead>
          <tbody>${log.map((l) => `<tr><td class="mono">${l.rev}</td><td class="mono" style="white-space:nowrap">${fmtDateTime(l.at)}</td><td>${esc(l.text)}</td></tr>`).join('')}</tbody></table></section>
        ${partsBox}
      </div>
      <section class="box w2" style="gap:0;border-width:1.5px"><div class="bar"><h2>${done ? 'ผลการปิดงาน' : 'บันทึกผลและปิดงาน'}</h2></div><div class="pad">${action}</div></section>
    </div></section>`;
}

function viewWork() {
  const rows = state.workOrders.filter(FILTERS[state.filter][1]);
  const chips = Object.entries(FILTERS).map(([k, [label, test]]) => `<button type="button" data-act="filter" data-id="${k}" aria-pressed="${state.filter === k}">${label}<span>${state.workOrders.filter(test).length}</span></button>`).join('');
  const body = rows.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}" aria-selected="${w.id === state.selectedWo}">
      <td><button type="button" class="link" data-act="open-wo" data-id="${esc(w.id)}">${esc(w.id)}</button></td>
      <td>${tag(w.asset)}</td><td>${esc(w.title)}<span class="sub">${TYPE[w.type]}</span></td>
      <td class="dim" style="white-space:nowrap">${esc(w.tech || 'ยังไม่มอบหมาย')}</td>
      <td class="mono" style="white-space:nowrap">${fmtDateTime(w.startAt)}</td><td>${lamp(w.status)}</td></tr>`).join('');
  const w = state.workOrders.find((x) => x.id === state.selectedWo);
  return `${state.form === 'wo' ? formWorkOrder() : ''}
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px"><div class="chips" role="group" aria-label="กรองตามสถานะ">${chips}</div>
      <button type="button" class="btn" data-act="export-wo">ส่งออก CSV</button></div>
    <section class="box" aria-label="รายการใบสั่งงาน">${rows.length
      ? `<div class="scroll"><table style="min-width:720px"><thead><tr><th scope="col">เลขที่</th><th scope="col">เครื่อง</th><th scope="col">งาน</th><th scope="col">ช่าง</th><th scope="col">แจ้งเมื่อ</th><th scope="col">สถานะ</th></tr></thead><tbody>${body}</tbody></table></div>`
      : '<p class="empty">ไม่มีงานในสถานะนี้</p>'}</section>
    ${w ? woDetail(w) : ''}`;
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
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:14px 16px">${html}</div>
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
    return `<tr class="pick" data-act="open-asset" data-id="${esc(x.id)}" aria-selected="${x.id === a?.id}">
      <td><button type="button" class="link" data-act="open-asset" data-id="${esc(x.id)}">${esc(x.id)}</button></td><td>${esc(x.name)}</td>
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
      <section class="box w2"><div class="bar"><h2 style="display:flex;gap:12px;align-items:baseline"><span class="mono">${esc(a.id)}</span>${esc(a.name)}</h2><span class="actions">${editBtn('assets', a.id)}${delBtn('assets', a.id, 'ลบเครื่องนี้')}</span></div>
        <dl class="facts"><div><dt>ตำแหน่ง</dt><dd>${esc(a.line || '—')}</dd></div><div><dt>ระดับความสำคัญ</dt><dd>${esc(a.cls || '—')}</dd></div>
          <div><dt>ผู้ผลิต</dt><dd>${esc(a.maker || '—')}</dd></div><div><dt>รุ่น</dt><dd class="mono">${esc(a.model || '—')}</dd></div>
          <div><dt>ปีที่ติดตั้ง</dt><dd class="mono">${esc(a.year || '—')}</dd></div><div><dt>หยุด 7 วัน</dt><dd class="mono">${hours(mergedDown(a.id, m.from, m.now))} ชม.</dd></div></dl>
        <div class="bar" style="border-top:1px solid var(--ink)"><h2>แผน PM ของเครื่องนี้</h2></div>
        ${pms.map((p) => `<div class="list-row"><span class="mono ${p.dueDate < t0 ? 'alarm' : ''}">${fmtDate(p.dueDate)}</span><span class="t"><span>${esc(p.task)}</span><span class="s">ทุก ${p.intervalDays} วัน</span></span><span></span></div>`).join('') || '<p class="empty">ยังไม่มีแผน PM</p>'}
      </section>
      <section class="box w3" style="gap:0"><div class="bar"><h2>ประวัติงาน</h2></div>
        ${hist.length ? `<div class="scroll"><table style="min-width:520px"><thead><tr><th scope="col">วันที่</th><th scope="col">งาน</th><th scope="col">สาเหตุ</th><th scope="col" class="num">หยุด (ชม.)</th></tr></thead><tbody>
          ${hist.map((w) => `<tr class="pick" data-act="open-wo" data-id="${esc(w.id)}"><td class="mono" style="white-space:nowrap">${fmtDate(w.startAt)}</td><td>${esc(w.title)}<span class="sub">${esc(w.id)} · ${STATUS[w.status][0]}</span></td><td class="mono">${esc(w.cause || '—')}</td><td class="mono num">${w.type === 'inspect' ? '—' : hours((w.endAt ?? m.now) - w.startAt)}</td></tr>`).join('')}
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
    return `<section class="box"><div class="bar"><h2 class="${late ? 'alarm' : ''}">${label} <span class="mono dim" style="font-size:13px;font-weight:400">${items.length}</span></h2></div>
      <div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">ครบกำหนด</th><th scope="col">เครื่อง</th><th scope="col">งาน</th><th scope="col">รอบ</th><th scope="col"><span class="sr">คำสั่ง</span></th></tr></thead><tbody>
      ${items.map((p) => `<tr><td class="mono ${late ? 'alarm' : ''}" style="white-space:nowrap">${fmtDate(p.dueDate)}</td><td>${tag(p.asset)}</td><td>${esc(p.task)}</td><td class="dim" style="white-space:nowrap">ทุก ${p.intervalDays} วัน</td>
        <td class="num"><span class="actions" style="justify-content:flex-end">${canTech() ? `<button type="button" class="btn small" data-act="pm-done" data-id="${esc(p.id)}">บันทึกว่าทำแล้ว</button>` : ''}${editBtn('pmPlans', p.id)}${delBtn('pmPlans', p.id)}</span></td></tr>`).join('')}
      </tbody></table></div></section>`;
  }).join('');
  return `${form}${summary}${html || '<section class="box"><p class="empty">ยังไม่มีแผน PM</p></section>'}`;
}

/* ---------- SH-05 อะไหล่ ---------- */
function viewParts() {
  const form = recordForm('parts');
  const toOrder = (p) => (p.qty <= p.min ? Math.max((p.max || p.min * 2 || 1) - p.qty, 1) : 0);
  const rows = [...state.parts].sort((a, b) => a.qty / (a.min || 1) - b.qty / (b.min || 1)).map((p) => `<tr>
    <td class="mono" style="white-space:nowrap">${esc(p.id)}</td><td>${esc(p.name)}</td><td class="mono">${esc(p.bin)}</td>
    <td class="mono num ${p.qty === 0 ? 'alarm' : ''}">${p.qty} / ${p.min}</td><td class="mono num">${p.max || '—'}</td>
    <td class="mono num">${toOrder(p) ? `<b>${toOrder(p)}</b>` : '<span class="dim">—</span>'}</td>
    <td class="num"><span class="actions" style="justify-content:flex-end">${canTech() ? `<button type="button" class="btn small" data-act="part" data-id="${esc(p.id)}" data-delta="1">รับเข้า 1</button>` : ''}${editBtn('parts', p.id)}${delBtn('parts', p.id)}</span></td></tr>`).join('');
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
    return `<tr><td class="mono" style="white-space:nowrap">${esc(g.id)}</td><td>${esc(g.name)}<span class="sub">${esc(g.range || '')}</span></td><td>${esc(g.location || '—')}</td>
      <td class="dim" style="white-space:nowrap">ทุก ${g.intervalDays} วัน</td><td class="mono" style="white-space:nowrap">${g.lastCal ? fmtDateY(g.lastCal) : '—'}</td>
      <td class="mono ${k === 'late' ? 'alarm' : ''}" style="white-space:nowrap">${fmtDateY(g.dueDate)}</td>
      <td><span class="lamp" style="--c:${c};--b:${b}">${label}</span>${g.note ? `<span class="sub">${esc(g.note)}</span>` : ''}</td>
      <td class="num"><span class="actions" style="justify-content:flex-end">${canTech() ? `<button type="button" class="btn small" data-act="cal" data-id="${esc(g.id)}" data-pass="1">ผ่าน</button><button type="button" class="btn small" data-act="cal" data-id="${esc(g.id)}" data-pass="0" ${g.status === 'hold' ? 'disabled' : ''}>ไม่ผ่าน</button>` : ''}${editBtn('gauges', g.id)}${delBtn('gauges', g.id)}</span></td></tr>`;
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
  return `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px"><div class="chips" role="group" aria-label="ช่วงเวลา">${chips}</div>
      <button type="button" class="btn" data-act="export-kpi">ส่งออก CSV</button></div>
    <section class="stats" aria-label="สรุป KPI">
      <div class="stat"><span class="label">Availability</span><span class="fig">${(100 * (1 - total.down / span)).toFixed(1)}<small>%</small></span><span class="cap">หยุดรวม ${hours(total.down)} ชม.</span></div>
      <div class="stat"><span class="label">MTBF</span><span class="fig">${total.fails ? hours((span - total.down) / total.fails) : '—'}<small> ชม.</small></span><span class="cap">เครื่องเสีย ${total.fails} ครั้ง</span></div>
      <div class="stat"><span class="label">MTTR</span><span class="fig">${hours(mttr)}<small> ชม.</small></span><span class="cap">จากงานซ่อมที่ปิดแล้ว ${closed.length} ใบ</span></div>
      <div class="stat"><span class="label">PM compliance</span><span class="fig ${pmc.pct < 90 ? 'alarm' : ''}">${pmc.pct.toFixed(0)}<small>%</small></span><span class="cap">ทันกำหนด ${pmc.onTime} จาก ${pmc.done + pmc.late} งาน</span></div>
    </section>
    <div class="split">
      <section class="box w3" style="gap:0"><div class="bar"><h2>เวลาหยุดรายเครื่อง ${state.period} วัน</h2></div>
        <div class="scroll"><table style="min-width:640px"><thead><tr><th scope="col">เครื่อง</th><th scope="col" style="width:34%">เวลาหยุด (ชม.)</th><th scope="col" class="num">เสีย</th><th scope="col" class="num">MTBF</th><th scope="col" class="num">MTTR</th><th scope="col" class="num">Avail.</th></tr></thead><tbody>
        ${ranked.map((r, i) => `<tr class="pick" data-act="open-asset" data-id="${esc(r.a.id)}"><td>${tag(r.a.id)} <span class="dim">${esc(r.a.name)}</span></td>
          <td><span style="display:flex;align-items:center;gap:8px"><span style="height:10px;width:${((r.down / maxDown) * 100).toFixed(1)}%;min-width:${r.down ? 2 : 0}px;background:${i === 0 && r.down ? 'var(--stop)' : 'var(--ink-2)'}"></span><span class="mono">${hours(r.down)}</span></span></td>
          <td class="mono num">${r.fails}</td><td class="mono num">${r.mtbf == null ? '—' : hours(r.mtbf)}</td><td class="mono num">${r.mttr == null ? '—' : hours(r.mttr)}</td><td class="mono num">${r.avail.toFixed(1)}%</td></tr>`).join('')}
        </tbody></table></div></section>
      <section class="box w2" style="gap:0"><div class="bar"><h2>สาเหตุการเสีย (Pareto)</h2></div>
        ${causes.length ? `<table><thead><tr><th scope="col">รหัส</th><th scope="col">สาเหตุ</th><th scope="col" class="num">ครั้ง</th><th scope="col" class="num">สะสม</th></tr></thead><tbody>
          ${causes.map(([k, nn]) => { cum += nn; return `<tr><td class="mono">${esc(k)}</td><td>${esc((CAUSES.find(([c]) => c === k) || [, k])[1])}</td><td class="mono num">${nn}</td><td class="mono num">${((100 * cum) / causeTotal).toFixed(0)}%</td></tr>`; }).join('')}
        </tbody></table>` : '<p class="empty">ยังไม่มีงานซ่อมที่ปิดพร้อมรหัสสาเหตุในช่วงนี้</p>'}
        <p class="hint" style="padding:12px 16px">เลือกแก้สาเหตุที่สะสมถึงราว 80% ก่อน จะลดเวลาหยุดได้มากที่สุด</p></section>
    </div>`;
}

/* ---------- SH-08 เชื่อมต่อเซิร์ฟเวอร์ ---------- */
function viewServer() {
  const b = state.backend;
  const live = b.mode === 'firebase';
  const colls = { assets: 'เครื่อง', workOrders: 'ใบงาน', pmPlans: 'แผน PM', parts: 'อะไหล่', gauges: 'เครื่องมือวัด' };
  return `<div class="split">
    <section class="box w3" style="gap:0"><div class="bar"><h2>เชื่อม Firebase</h2><span class="lamp" style="--c:${live ? 'var(--ok)' : 'var(--run)'}">${live ? `เชื่อมโปรเจกต์ ${esc(b.projectId)} แล้ว` : 'ยังไม่เชื่อมต่อ'}</span></div>
      <div class="pad">
      ${live ? `<p>ข้อมูลทุกหน้าอัปเดตแบบเรียลไทม์จาก Firestore</p>` : `<p class="dim">ตอนนี้ใช้ข้อมูลตัวอย่างที่เก็บในเบราว์เซอร์เครื่องนี้ วางค่าจาก Firebase console เพื่อใช้ข้อมูลจริงร่วมกันทุกเครื่อง</p>
        <form class="stack" data-form="config"><div class="field"><label for="s-config">firebaseConfig</label>
        <textarea id="s-config" name="config" class="code" rows="8" spellcheck="false" required placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };'>${esc(state.draft.config)}</textarea></div>
        <div class="actions"><button class="btn solid">บันทึกและเชื่อมต่อ</button><button type="button" class="btn" data-act="reset-demo">รีเซ็ตข้อมูลตัวอย่าง</button></div></form>`}
      ${live ? `<div class="actions">${state.canSeed ? '<button type="button" class="btn solid" data-act="seed">ใส่ข้อมูลตัวอย่างลง Firestore</button>' : ''}<button type="button" class="btn" data-act="disconnect">เลิกเชื่อมต่อเครื่องนี้</button></div>` : ''}
      ${state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}</div>
    </section>
    <section class="box w2" style="gap:0"><div class="bar"><h2>สำรองข้อมูล</h2></div>
      <div class="pad"><p class="dim">ดาวน์โหลดข้อมูลทั้งหมด ${COLLECTIONS.map((c) => `${state[c].length.toLocaleString()} ${colls[c]}`).join(', ')} เป็นไฟล์ JSON เก็บไว้เป็นหลักฐานหรือย้ายระบบ</p>
      <div class="actions"><button type="button" class="btn" data-act="backup">ดาวน์โหลดไฟล์สำรอง</button></div></div></section>
  </div>`;
}

function viewLogin() {
  return `<div class="login"><form data-form="login">
    <div class="bar" style="display:flex;align-items:center;gap:10px">${logo}<div><b style="font-size:17px">CMMS</b><div class="mono dim" style="font-size:12px">${esc(state.backend.projectId)}</div></div></div>
    <div class="pad">
    <div class="field"><label for="l-email">อีเมล</label><input id="l-email" name="email" type="email" autocomplete="username" required></div>
    <div class="field"><label for="l-pass">รหัสผ่าน</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
    ${state.loadError ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}
    <button class="btn solid" style="justify-content:center">เข้าสู่ระบบ</button>
    <button type="button" class="btn" style="justify-content:center" data-act="disconnect">เลิกเชื่อมต่อเครื่องนี้</button></div></form></div>`;
}

/* ---------- วาดหน้า ---------- */
function render() {
  if (!state.backend || state.user === undefined) { app.innerHTML = '<p style="padding:24px">กำลังโหลด</p>'; return; }
  if (!state.user) { app.innerHTML = viewLogin(); return; }
  const m = metrics();
  const counts = { work: m.open.length, assets: state.assets.length, pm: m.pmSoon.length, parts: m.low.length, gauges: m.gaugeAlert.length || '' };
  const nav = Object.entries(PAGES).map(([k, [code, label]]) => `<button type="button" data-act="nav" data-id="${k}" ${state.page === k ? 'aria-current="page"' : ''}><span class="code">${code}</span><span>${label}</span><span class="n">${counts[k] ?? ''}</span></button>`).join('');
  const views = { overview: viewOverview, work: viewWork, assets: viewAssets, pm: viewPm, parts: viewParts, gauges: viewGauges, report: viewReport, server: viewServer };
  const noRole = !state.user.role;
  const [code, , full] = PAGES[state.page];
  const n = Object.keys(PAGES).indexOf(state.page) + 1;
  const add = canAdmin() && ADD_LABEL[state.page] ? `<button type="button" class="btn" data-act="add" data-id="${state.page}">${ADD_LABEL[state.page]}</button>` : '';
  const report = noRole ? '' : `<button type="button" class="btn solid" data-act="report">${icon('<path d="M12 5v14M5 12h14"/>')}แจ้งซ่อม</button>`;
  app.innerHTML = `<div class="page"><div class="sheet">
    <div class="ruler" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
    <div class="body">
      <aside class="side"><div class="brand">${logo}<div><b>CMMS</b><span>แผนกซ่อมบำรุง</span></div></div>
        <nav class="nav" aria-label="รายการแผ่นงาน"><span class="label">รายการแผ่นงาน</span>${nav}</nav>
        <div class="who"><b>${esc(state.user.name)}</b><span>${esc({ admin: 'หัวหน้า / แอดมิน', tech: 'ช่างซ่อมบำรุง', operator: 'ฝ่ายผลิต' }[state.user.role] || 'ยังไม่มีสิทธิ์')}</span>${state.backend.mode === 'firebase' ? '<button type="button" data-act="logout">ออกจากระบบ</button>' : ''}</div></aside>
      <main>
        <header class="head"><div><span class="doc">CMMS-${code} · REV A</span><h1>${full}</h1><span class="meta">${today()}</span></div>
          <div class="actions"><div class="searchwrap"><label for="q" class="sr">ค้นหาเครื่อง ใบงาน อะไหล่ เครื่องมือวัด</label><input id="q" class="search" type="search" autocomplete="off" placeholder="ค้นหาเครื่อง ใบงาน อะไหล่" value="${esc(state.q)}"><div id="q-res" class="qres" hidden></div></div>${add}${report}</div></header>
        ${noRole ? '<p class="notice err">บัญชีนี้ยังไม่มีสิทธิ์ ให้แอดมินสร้างเอกสารใน users ตาม uid ของบัญชีนี้</p>' : ''}
        ${state.loadError && state.page !== 'server' ? `<p class="notice err">${esc(state.loadError)}</p>` : ''}
        ${noRole && state.page !== 'server' ? '' : views[state.page](m)}
        ${sheetBlock(n)}
      </main>
    </div></div></div>${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ''}`;
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
function toast(msg) {
  state.toast = msg;
  refresh();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = ''; refresh(); }, 3200);
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
  if (code.startsWith('auth/')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  return err?.message || 'ทำรายการไม่สำเร็จ';
}

function listen() {
  state.unsubs.forEach((u) => u());
  state.unsubs = COLLECTIONS.map((c) => state.backend.subscribe(c, (rows) => {
    state[c] = c === 'assets' ? rows.sort((a, b) => a.id.localeCompare(b.id)) : (c === 'workOrders' ? rows.sort((a, b) => b.startAt - a.startAt) : rows);
    state.loadError = '';
    state.lastSync = Date.now();
    refresh();
  }, (err) => { console.error(err); state.loadError = explain(err); refresh(); }));
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
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (PAGES[p] && p !== state.page) go(p); });

function addLog(w, text) {
  return [...(w.log || []), { at: Date.now(), text }];
}

/* ---------- การกระทำ ---------- */
const actions = {
  nav: (id) => go(id),
  filter: (id) => { state.filter = id; render(); },
  'open-wo': (id) => {
    const w = state.workOrders.find((x) => x.id === id);
    if (state.selectedWo !== id) state.close = { cause: w?.cause || '', action: w?.action || '' };
    state.selectedWo = id;
    if (w && !FILTERS[state.filter][1](w)) state.filter = w.status === 'done' ? 'done' : 'active';
    if (state.page !== 'work') go('work'); else render();
    document.querySelector('[aria-label="รายละเอียดใบสั่งงาน"]')?.scrollIntoView({ block: 'start' });
  },
  'open-asset': (id) => { state.selectedAsset = id; if (state.page !== 'assets') go('assets'); else render(); window.scrollTo(0, 0); },
  report: () => { go('work'); state.form = 'wo'; state.draft = { asset: state.assets[0]?.id, priority: 'stop' }; render(); document.getElementById('f-title')?.focus(); },
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
    const rows = state.workOrders.filter(FILTERS[state.filter][1]);
    download(`work-orders-${isoDate(Date.now())}.csv`, csv([
      ['เลขที่', 'เครื่อง', 'ประเภท', 'งาน', 'สถานะ', 'ผู้แจ้ง', 'ผู้อนุมัติ', 'ช่าง', 'แจ้งเมื่อ', 'ปิดเมื่อ', 'เวลาหยุด (ชม.)', 'รหัสสาเหตุ', 'การแก้ไข', 'อะไหล่ที่เบิก'],
      ...rows.map((w) => [w.id, w.asset, TYPE[w.type], w.title, STATUS[w.status][0], w.requestedBy, w.approvedBy, w.tech, fmtDateTime(w.startAt), w.endAt ? fmtDateTime(w.endAt) : '', w.type === 'inspect' ? '' : hours((w.endAt ?? Date.now()) - w.startAt), w.cause, w.action, (w.partsUsed || []).map((u) => `${u.id}×${u.qty}`).join(' ')])
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
  logout: () => run(() => state.backend.signOut())
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
    ...state.parts.filter((p) => has(p.id, p.name)).slice(0, 4).map((p) => ['open-part', p.id, p.id, p.name, `อะไหล่ · คงเหลือ ${p.qty}`]),
    ...state.gauges.filter((g) => has(g.id, g.name, g.location)).slice(0, 4).map((g) => ['open-gauge', g.id, g.id, g.name, `เครื่องมือวัด · ${gaugeState(g)[1]}`])
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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.q) { state.q = ''; const i = document.getElementById('q'); if (i) i.value = ''; paintSearch(); }
});

app.addEventListener('input', (e) => {
  if (e.target.id === 'q') { state.q = e.target.value; paintSearch(); return; }
  const key = e.target.dataset.close;
  if (!key) return;
  state.close[key] = e.target.value;
  const btn = app.querySelector('[data-act="wo-close"]');
  const ready = state.close.cause && state.close.action.trim();
  if (btn) btn.disabled = !ready;
  const hint = btn?.closest('.pad')?.querySelector('.hint');
  if (hint) hint.textContent = ready ? 'ปิดงานแล้วระบบจะบันทึกเวลาและเพิ่มเข้าประวัติเครื่อง' : 'เลือกรหัสสาเหตุและกรอกการแก้ไขที่ต้นเหตุก่อนปิดงาน';
});

app.addEventListener('change', (e) => {
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
      const id = await state.backend.createWorkOrder({ asset: d.asset, title, type, requestedBy: me, status: 'pending', log: [{ at: Date.now(), text: `${me} ${type === 'breakdown' ? 'แจ้งซ่อม' : 'แจ้งตรวจสอบ'}` }] });
      state.selectedWo = id; state.filter = 'active'; state.close = { cause: '', action: '' };
      done(`เปิด ${id} แล้ว รออนุมัติ`);
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
        state.loadError = '';
        await state.backend.signIn(d.email, d.password);
      } catch (err) {
        state.loadError = explain(err);
        render();
      }
    }
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
  state.backend.onAuth(async (user) => {
    state.user = user;
    state.unsubs.forEach((u) => u());
    state.unsubs = [];
    state.loadError = '';
    if (user?.role) {
      listen();
      if (!state.selectedWo) state.selectedWo = state.workOrders.find((w) => w.status !== 'done')?.id ?? null;
      if (user.role === 'admin') {
        try { state.canSeed = await state.backend.isEmpty(); } catch { state.canSeed = false; }
        if (state.canSeed) state.page = 'server';
      }
    } else if (user) {
      state.page = 'server';
    }
    render();
  });
  setInterval(() => refresh(), 60000);
})();
