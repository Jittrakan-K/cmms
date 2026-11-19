// จัดเนื้อหาแต่ละหน้าให้พอดีหนึ่งจอ ส่วนที่เกินแบ่งเป็นหน้าถัดไป กดปุ่มหรือคีย์ PageUp/PageDown เพื่อเปลี่ยนหน้า
// ทำงานกับ DOM ที่วาดเสร็จแล้ว: วัดความสูงจริงของแต่ละกล่อง ถ้ากล่องใดสูงเกินจอจะแบ่งแถวในตาราง/รายการข้างในออกเป็นช่วง
// ไม่คัดลอก element (id ไม่ซ้ำ ฟอร์มยังทำงานตามเดิม) แค่ซ่อนส่วนที่ไม่อยู่ในหน้านั้นด้วย data-off

const MQ = matchMedia('(min-width: 60.01rem) and (min-height: 32rem)');
let cur = null; // { box, bar, pages, pieces, wrappers, key }

// ผู้ใช้ปิดได้ในหน้าตั้งค่า (จำไว้ในเบราว์เซอร์เครื่องนั้น)
export function fitPref() { try { return localStorage.getItem('cmms.fit') !== 'off'; } catch { return true; } }
export function setFitPref(on) { try { localStorage.setItem('cmms.fit', on ? 'on' : 'off'); } catch { /* ไม่มีที่เก็บก็ใช้ค่าเริ่มต้น */ } }
export const fitWanted = () => MQ.matches && fitPref();

function rectIn(el, top0) {
  const r = el.getBoundingClientRect();
  return { top: r.top - top0, bottom: r.bottom - top0, h: r.height };
}

// กลุ่มแถวในรายการ: ลูกที่ซ้อนทับแนวตั้งกับแถวก่อนหน้านับเป็นแถวเดียวกัน เช่นช่องในแผนผังเครื่อง
function rowGroups(list, top0) {
  const groups = [];
  for (const el of list.children) {
    const r = rectIn(el, top0);
    if (!r.h) continue;
    const g = groups[groups.length - 1];
    if (g && r.top < g.bottom - 2) { g.els.push(el); g.bottom = Math.max(g.bottom, r.bottom); }
    else groups.push({ els: [el], top: r.top, bottom: r.bottom });
  }
  return groups;
}

// หารายการที่ใหญ่ที่สุดในกล่องที่แบ่งแถวได้ (แต่ละแถวเตี้ยกว่าครึ่งจอ)
function dominantList(block, H, top0) {
  let best = null;
  const blockH = rectIn(block, top0).h;
  const consider = (c) => {
    if (c.children.length < 2 || c.matches('svg, svg *, select, thead, tr, button')) return;
    const r = rectIn(c, top0);
    if (r.h <= (best?.h ?? 0)) return;
    const groups = rowGroups(c, top0);
    if (groups.length >= 2 && r.h >= blockH * 0.4 && groups.every((g) => g.bottom - g.top <= H / 2)) best = { el: c, h: r.h, groups };
  };
  const walk = (el, depth) => {
    if (depth > 9) return;
    for (const c of el.children) {
      if (c.matches('button, a, tr, li, [data-act], svg')) continue;
      consider(c); walk(c, depth + 1);
    }
  };
  consider(block);
  if (!best) walk(block, 0);
  return best;
}

function stacked(el, top0) {
  const kids = [...el.children].map((c) => rectIn(c, top0)).filter((r) => r.h);
  return kids.length >= 1 && kids.every((r, i) => i === 0 || r.top >= kids[i - 1].bottom - 1);
}

function collect(parent, H, top0, out, wrappers) {
  for (const el of parent.children) {
    const r = rectIn(el, top0);
    if (!r.h) continue;
    if (el.hasAttribute('data-flow')) {
      // กล่องที่ยอมให้ไหลต่อหน้าถัดไป: แยกเป็นส่วนย่อย หรือแบ่งแถวในรายการ แม้จะสูงไม่เกินจอ
      if (stacked(el, top0) && el.children.length > 1) { wrappers.push(el); collect(el, H, top0, out, wrappers); continue; }
      const fl = dominantList(el, H, top0);
      if (fl) { out.push({ el, ...r, list: fl }); continue; }
    }
    if (r.h <= H) {
      // ตารางยาว (ตั้งแต่ 6 แถว) แบ่งต่อหน้าถัดไปได้ ถ้าที่ว่างท้ายหน้าเหลือมาก กล่องเล็กไม่ถูกตัด
      const sl = el.matches('section, .box, table, .scroll') ? dominantList(el, H, top0) : null;
      out.push({ el, ...r, soft: sl && sl.groups.length >= 6 ? sl : null });
      continue;
    }
    const list = dominantList(el, H, top0);
    const span = list ? list.groups[list.groups.length - 1].bottom - list.groups[0].top : 0;
    if (list && r.h - span <= H * 0.6) { out.push({ el, ...r, list }); continue; }
    if (stacked(el, top0)) { wrappers.push(el); collect(el, H, top0, out, wrappers); continue; }
    out.push({ el, ...r });
  }
}

const HEAD = '.bar, h2, h3, .hint';
function pack(blocks, H) {
  const pages = [[]];
  let used = 0, prevBottom = 0;
  const next = () => { pages.push([]); used = 0; };
  blocks.forEach((b, bi) => {
    let gap = pages[pages.length - 1].length ? Math.max(0, b.top - prevBottom) : 0;
    if (!b.list) {
      // หัวข้อไม่ค้างท้ายหน้า: ต้องมีที่ให้ส่วนถัดไป (หรือแถวแรกของมัน) อยู่หน้าเดียวกัน
      let keep = 0;
      if (b.el.matches(HEAD)) {
        let k = bi + 1, last = b;
        while (blocks[k] && !blocks[k].list && blocks[k].el.matches(HEAD)) { keep += Math.max(0, blocks[k].top - last.bottom) + blocks[k].h; last = blocks[k]; k++; }
        const nx = blocks[k];
        if (nx) keep += Math.max(0, nx.top - last.bottom) + Math.min(nx.list ? nx.list.groups[0].bottom - nx.top : nx.h, H / 2);
      }
      if (used && used + gap + b.h + keep > H) {
        const sg = b.soft?.groups;
        const room = H - used - gap - (sg ? (sg[0].top - b.top) + (b.bottom - sg[sg.length - 1].bottom) : 0);
        if (sg && room >= (sg[2].bottom - sg[0].top) && room >= H * 0.3) { b.list = b.soft; }
        else { next(); gap = 0; }
      }
    }
    if (!b.list) {
      pages[pages.length - 1].push({ el: b.el });
      used += gap + b.h;
      prevBottom = b.bottom;
      return;
    }
    const g = b.list.groups;
    const head = g[0].top - b.top, tail = b.bottom - g[g.length - 1].bottom;
    let i = 0;
    while (i < g.length) {
      let room = H - (used ? used + gap : 0) - head - tail;
      if (used && room < g[i].bottom - g[i].top) { next(); gap = 0; room = H - head - tail; }
      let j = i;
      while (j < g.length && g[j].bottom - g[i].top <= room) j++;
      if (j === i) j = i + 1;
      pages[pages.length - 1].push({ el: b.el, list: b.list, from: i, to: j });
      used += gap + head + (g[j - 1].bottom - g[i].top) + tail;
      i = j;
      if (i < g.length) { next(); gap = 0; }
    }
    prevBottom = b.bottom;
  });
  return pages.filter((p) => p.length);
}

function show(p) {
  const { box, pages, pieces, wrappers } = cur;
  const page = pages[p] || [];
  for (const b of pieces) {
    const on = page.filter((x) => x.el === b.el);
    b.el.toggleAttribute('data-off', !on.length);
    if (b.list) {
      const r = on[0];
      b.list.groups.forEach((g, i) => { const vis = r && i >= r.from && i < r.to; g.els.forEach((e) => e.toggleAttribute('data-off', !vis)); });
    }
  }
  for (const w of [...wrappers].reverse()) {
    const kids = [...w.children].filter((c) => pieces.some((b) => b.el === c) || wrappers.includes(c));
    w.toggleAttribute('data-off', kids.length > 0 && kids.every((c) => c.hasAttribute('data-off')));
  }
  box.style.overflowY = '';
  box.scrollTop = 0;
  if (box.scrollHeight > box.clientHeight + 1) box.style.overflowY = 'auto';
  cur.at = p;
  paintBar();
}

function paintBar() {
  const { bar, pages, at, label } = cur;
  const n = pages.length;
  bar.hidden = n < 2;
  if (n < 2) { bar.innerHTML = ''; return; }
  const dots = n <= 12
    ? `<span class="pg-dots">${pages.map((_, i) => `<button type="button" class="pg-dot" data-pg="${i}" aria-label="หน้า ${i + 1}" ${i === at ? 'aria-current="page"' : ''}></button>`).join('')}</span>`
    : `<span class="pg-dots"><label class="sr" for="pg-sel">ไปที่หน้า</label><select id="pg-sel" class="fsel" data-pgsel>${pages.map((_, i) => `<option value="${i}" ${i === at ? 'selected' : ''}>หน้า ${i + 1}</option>`).join('')}</select></span>`;
  bar.innerHTML = `<span class="pg-n">${label} หน้า <b class="mono">${at + 1}</b> จาก <span class="mono">${n}</span></span>${dots}
    <span class="pg-btns"><button type="button" class="btn small" data-pg="${at - 1}" ${at === 0 ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>ก่อนหน้า</button>
    <button type="button" class="btn small" data-pg="${at + 1}" ${at >= n - 1 ? 'disabled' : ''}>ถัดไป<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></span>`;
}

function pageOf(el) {
  if (!cur) return -1;
  return cur.pages.findIndex((pg) => pg.some((x) => {
    if (!x.el.contains(el)) return false;
    if (!x.list) return true;
    const gi = x.list.groups.findIndex((g) => g.els.some((e) => e.contains(el)));
    return gi < 0 ? x.from === 0 : gi >= x.from && gi < x.to;
  }));
}

// คืนค่าเลขหน้าที่แสดงอยู่ เพื่อให้แอปจำไว้ตอนวาดใหม่
export function fitGoto(p) {
  if (!cur?.pages.length) return;
  const q = Math.max(0, Math.min(cur.pages.length - 1, p));
  show(q);
  cur.onPage?.(q);
}
export function fitStep(d) { if (cur) fitGoto(cur.at + d); }
export const fitActive = () => !!cur && cur.pages.length > 1;

export function fitReveal(el) {
  if (!cur || !el || !cur.box.contains(el)) return;
  const p = pageOf(el);
  if (p >= 0 && p !== cur.at) fitGoto(p);
}

/**
 * box: กล่องเนื้อหา, bar: แถบเปลี่ยนหน้า
 * opts: { enabled, page, keep (element ที่ต้องอยู่ในหน้าที่แสดง), label, onPage }
 */
export function fit(box, bar, opts) {
  document.documentElement.classList.toggle('fit', !!opts.enabled);
  box.querySelectorAll('[data-off]').forEach((e) => e.removeAttribute('data-off'));
  box.style.overflowY = '';
  if (!opts.enabled) { cur = null; bar.hidden = true; bar.innerHTML = ''; return; }
  // วัดพื้นที่ตอนแถบเปลี่ยนหน้าแสดงอยู่ ความสูงจะได้ตรงกับตอนใช้งานจริง
  bar.hidden = false;
  bar.innerHTML = '<span class="pg-n">&nbsp;</span><span class="pg-btns"><button type="button" class="btn small" disabled>&nbsp;</button></span>';
  const H = box.clientHeight - 6;
  const top0 = box.getBoundingClientRect().top;
  const pieces = [], wrappers = [];
  collect(box, H, top0, pieces, wrappers);
  const pages = pack(pieces, H);
  cur = { box, bar, pages, pieces, wrappers, at: 0, label: opts.label || '', onPage: opts.onPage };
  let p = Math.max(0, Math.min(pages.length - 1, opts.page || 0));
  if (opts.keep) { const k = pageOf(opts.keep); if (k >= 0) p = k; }
  show(p);
}

// เมื่อโค้ดเดิมสั่งเลื่อนไปหรือโฟกัส element ที่อยู่หน้าอื่น ให้เปิดหน้านั้นก่อน
const siv = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (o) { fitReveal(this); return siv.call(this, o); };
const foc = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function (o) { fitReveal(this); return foc.call(this, o); };
