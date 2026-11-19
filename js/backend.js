// ชั้นเชื่อมต่อข้อมูล: หน้าเว็บคุยกับไฟล์นี้เท่านั้น
// ถ้าวันหน้าจะย้ายไป Supabase หรือ PocketBase ให้เขียนคลาสใหม่ที่มีเมธอดชุดเดียวกัน
// แล้วแก้ createBackend() จุดเดียว ไม่ต้องแตะ app.js
import { firebaseConfig as fileConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/13.1.0';
const CONFIG_KEY = 'cmms.firebaseConfig';
const DEMO_KEY = 'cmms.demo.v3';
const HOUR = 3600000;
const DAY = 24 * HOUR;

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function workOrderId(seq, now = Date.now()) {
  const d = new Date(now);
  const ym = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
  return `WO-${ym}-${String(seq).padStart(3, '0')}`;
}

// สถานะใบงาน: pending รออนุมัติ → open อนุมัติแล้ว → doing กำลังซ่อม ⇄ parts รออะไหล่ → done ปิดงาน
// ประเภท: breakdown ซ่อมฉุกเฉิน, pm บำรุงรักษาตามแผน, inspect แจ้งตรวจสอบ
export function sampleData(now = Date.now()) {
  const ago = (h) => now - h * HOUR;
  const due = (d) => startOfToday() + d * DAY;
  const done = (seq, asset, type, title, startH, endH, tech, cause, action) => ({
    id: workOrderId(seq, now), asset, type, title, status: 'done',
    startAt: ago(startH), endAt: ago(endH), tech, requestedBy: type === 'pm' ? 'แผน PM' : 'ฝ่ายผลิต',
    approvedBy: 'วิชัย ร.', approvedAt: ago(startH - 0.1), cause, action, partsUsed: [],
    ...(type === 'pm' ? { onTime: true } : {}),
    log: [{ at: ago(startH), text: 'เปิดใบงาน' }, { at: ago(endH), text: `${tech} ปิดงาน` }]
  });
  return {
    assets: [
      ['PRN-101', 'เครื่องพิมพ์ครีมบัดกรี', 'ไลน์ SMT 1', 'A'],
      ['SPI-102', 'เครื่องตรวจครีมบัดกรี', 'ไลน์ SMT 1', 'B'],
      ['MNT-103', 'เครื่องติดตั้งชิ้นส่วนความเร็วสูง', 'ไลน์ SMT 1', 'A'],
      ['MNT-104', 'เครื่องติดตั้งชิ้นส่วนอเนกประสงค์', 'ไลน์ SMT 1', 'A'],
      ['RFL-105', 'เตาอบรีโฟลว์', 'ไลน์ SMT 1', 'A'],
      ['AOI-106', 'เครื่องตรวจด้วยภาพ', 'ไลน์ SMT 1', 'B'],
      ['PRN-201', 'เครื่องพิมพ์ครีมบัดกรี', 'ไลน์ SMT 2', 'A'],
      ['MNT-203', 'เครื่องติดตั้งชิ้นส่วน', 'ไลน์ SMT 2', 'A'],
      ['RFL-205', 'เตาอบรีโฟลว์', 'ไลน์ SMT 2', 'A'],
      ['AOI-206', 'เครื่องตรวจด้วยภาพ', 'ไลน์ SMT 2', 'B'],
      ['CMP-901', 'ปั๊มลม', 'ห้องสาธารณูปโภค', 'A'],
      ['N2G-902', 'เครื่องผลิตไนโตรเจน', 'ห้องสาธารณูปโภค', 'B']
    ].map(([id, name, line, cls]) => ({ id, name, line, cls, category: line.startsWith('ไลน์') ? 'Machine SMT' : 'Utility', use: id === 'AOI-206' ? 'standby' : 'inuse', maker: '', model: '', year: '', wi: { MNT: 'WI-DEMO-MNT', RFL: 'WI-DEMO-RFL' }[id.slice(0, 3)] || '' })),
    // ใบตรวจ TPM ตามแบบเครื่อง (เลขที่ WI) ความถี่เป็นจำนวนวัน
    checklists: [
      ['WI-DEMO-MNT', 'เครื่องติดตั้งชิ้นส่วน (ตัวอย่าง)', [
        ['ทำความสะอาด', 'หัวดูดและกล้องจับชิ้นงาน', 'มีฝุ่นหรือคราบกาว', 1, 'ต้องสะอาด ไม่มีคราบ'],
        ['จุดตรวจเช็ค', 'แรงดันลมเข้าเครื่อง', 'อ่านค่าที่เกจ', 1, '0.5 ± 0.05 MPa'],
        ['จุดตรวจเช็ค', 'ฟีดเดอร์', 'ล็อกไม่แน่น หรือมีเสียงผิดปกติ', 1, 'ล็อกแน่น ไม่มีเสียงผิดปกติ'],
        ['จุดตรวจเช็ค', 'ไส้กรองหัวดูด', 'อุดตัน สีคล้ำ', 7, 'ไม่อุดตัน'],
        ['จุดตรวจเช็คน้ำมันหล่อลื่น', 'รางเลื่อนแกน X/Y', 'จาระบีแห้ง', 30, 'มีจาระบีเคลือบทั่วราง'],
        ['จุดตรวจเช็ค', 'สายพานแกน Y', 'ความตึงและการสึกหรอ', 90, 'ไม่หย่อน ไม่มีรอยแตก']
      ]],
      ['WI-DEMO-RFL', 'เตาอบรีโฟลว์ (ตัวอย่าง)', [
        ['จุดตรวจเช็ค', 'อุณหภูมิแต่ละโซน', 'เทียบกับโปรไฟล์', 1, 'ไม่เกิน ± 5 °C จากค่าตั้ง'],
        ['จุดตรวจเช็ค', 'โซ่ลำเลียง', 'เสียงผิดปกติ สะดุด', 1, 'เดินเรียบ ไม่มีเสียงผิดปกติ'],
        ['ทำความสะอาด', 'ช่องดูดไอฟลักซ์', 'มีคราบฟลักซ์สะสม', 7, 'ไม่มีคราบอุดตัน'],
        ['จุดตรวจเช็คน้ำมันหล่อลื่น', 'โซ่ลำเลียง', 'โซ่แห้ง', 30, 'มีน้ำมันเคลือบทั่ว']
      ]]
    ].map(([id, name, items]) => ({ id, name, items: items.map(([kind, part, check, freq, std]) => ({ kind, part, check, freq, std })) })),
    workOrders: [
      {
        id: workOrderId(52, now), asset: 'MNT-103', type: 'breakdown',
        title: 'หัวดูดหยิบชิ้นงานพลาดต่อเนื่อง เครื่องหยุดด้วย pick-up error',
        status: 'doing', startAt: ago(1.3), endAt: null, tech: 'อนันต์ ส.', requestedBy: 'สมชาย ก.',
        approvedBy: 'วิชัย ร.', approvedAt: ago(1.17), cause: '', action: '',
        partsUsed: [{ id: 'FLT-NZ-04', qty: 4 }, { id: 'NZL-1005', qty: 2 }],
        log: [
          { at: ago(1.3), text: 'สมชาย ก. แจ้งซ่อม' },
          { at: ago(1.17), text: 'วิชัย ร. อนุมัติ มอบหมาย อนันต์ ส.' },
          { at: ago(0.92), text: 'อนันต์ ส. ทำ LOTO และเริ่มซ่อม' },
          { at: ago(0.33), text: 'เปลี่ยนไส้กรองหัวดูด 4 ชิ้น และหัวดูด 2 ชิ้น' }
        ]
      },
      {
        id: workOrderId(51, now), asset: 'AOI-206', type: 'inspect', title: 'ภาพจากกล้องด้านบนมืดเป็นช่วง',
        status: 'pending', startAt: ago(4.6), endAt: null, tech: '', requestedBy: 'มาลี ท.',
        approvedBy: '', approvedAt: null, cause: '', action: '', partsUsed: [], log: [{ at: ago(4.6), text: 'มาลี ท. แจ้งตรวจสอบ' }]
      },
      {
        id: workOrderId(50, now), asset: 'CMP-901', type: 'inspect', title: 'แรงดันลมตกช่วงเปลี่ยนกะ',
        status: 'open', startAt: ago(9.2), endAt: null, tech: '', requestedBy: 'ประเสริฐ บ.',
        approvedBy: 'วิชัย ร.', approvedAt: ago(8.5), cause: '', action: '', partsUsed: [],
        log: [{ at: ago(9.2), text: 'ประเสริฐ บ. แจ้งตรวจสอบ' }, { at: ago(8.5), text: 'วิชัย ร. อนุมัติ' }]
      },
      {
        id: workOrderId(49, now), asset: 'RFL-205', type: 'breakdown', title: 'มอเตอร์พัดลมโซน 7 มีเสียงดังแล้วหยุดหมุน',
        status: 'parts', startAt: ago(13), endAt: null, tech: 'วิชัย ร.', requestedBy: 'สมชาย ก.',
        approvedBy: 'วิชัย ร.', approvedAt: ago(12.9), cause: '', action: '', partsUsed: [],
        log: [
          { at: ago(13), text: 'สมชาย ก. แจ้งซ่อม' },
          { at: ago(12.9), text: 'วิชัย ร. อนุมัติ' },
          { at: ago(11), text: 'ตรวจพบลูกปืนมอเตอร์แตก สั่งมอเตอร์ FAN-RF-200W รอ 3–5 วัน' }
        ]
      },
      done(48, 'MNT-203', 'pm', 'PM รายเดือน ทำความสะอาดหัวติดตั้งและตรวจแรงดูด', 39, 36, 'อนันต์ ส.', 'PM', 'ทำตามแผน'),
      done(47, 'RFL-105', 'breakdown', 'ฮีตเตอร์โซน 4 อุณหภูมิไม่ถึงค่าตั้ง', 43, 40.5, 'อนันต์ ส.', 'C-WEAR', 'เปลี่ยนฮีตเตอร์โซน 4'),
      done(46, 'PRN-201', 'breakdown', 'ใบปาดสึก พิมพ์ครีมไม่เต็มแผ่น', 53, 51.5, 'วิชัย ร.', 'C-WEAR', 'เปลี่ยนใบปาด เพิ่มการวัดความสึกใน PM'),
      done(45, 'MNT-104', 'breakdown', 'แกน Z หัวที่ 2 ติดขัด', 65, 63.8, 'สมชาย ก.', 'C-LUB', 'ทำความสะอาดและหล่อลื่นแกน Z'),
      done(44, 'RFL-105', 'pm', 'PM รายเดือน', 87, 83, 'อนันต์ ส.', 'PM', 'ทำตามแผน'),
      done(43, 'N2G-902', 'breakdown', 'ความบริสุทธิ์ไนโตรเจนต่ำกว่าเกณฑ์', 103, 99, 'วิชัย ร.', 'C-PM', 'เปลี่ยนไส้กรองอากาศขาเข้าที่เลยรอบ'),
      done(42, 'PRN-101', 'pm', 'PM รายสัปดาห์ ล้างใบปาดและตรวจแรงกด', 111, 109, 'สมชาย ก.', 'PM', 'ทำตามแผน'),
      done(41, 'AOI-106', 'breakdown', 'ไฟส่องสว่างกระพริบ', 133, 132.2, 'อนันต์ ส.', 'C-ELEC', 'ขันขั้วต่อสายไฟให้แน่น'),
      done(40, 'MNT-103', 'breakdown', 'ฟีดเดอร์ช่อง 12 ป้อนเทปไม่เดิน', 149, 146.5, 'สมชาย ก.', 'C-SET', 'ตั้งระยะฟีดเดอร์ใหม่'),
      done(39, 'CMP-901', 'pm', 'PM รายเดือน ตรวจน้ำมันและไส้กรอง', 155, 153, 'วิชัย ร.', 'PM', 'ทำตามแผน')
    ],
    pmPlans: [
      ['pm-mnt104-nozzle', 'MNT-104', 'ทำความสะอาดหัวดูดและตรวจแรงดูดสุญญากาศ', 7, -2],
      ['pm-prn201-squeegee', 'PRN-201', 'ล้างใบปาดและตรวจแรงกด', 7, 0],
      ['pm-n2g902-filter', 'N2G-902', 'เปลี่ยนไส้กรองอากาศขาเข้า', 90, 1],
      ['pm-rfl105-flux', 'RFL-105', 'ทำความสะอาดระบบดูดไอฟลักซ์', 30, 2],
      ['pm-cmp901-oil', 'CMP-901', 'ตรวจน้ำมันและไส้กรองน้ำมัน', 30, 4],
      ['pm-mnt103-filter', 'MNT-103', 'เปลี่ยนไส้กรองหัวดูด', 7, 5],
      ['pm-aoi206-lens', 'AOI-206', 'ทำความสะอาดเลนส์และตรวจไฟส่องสว่าง', 30, 12],
      ['pm-rfl205-chain', 'RFL-205', 'ทำความสะอาดและหล่อลื่นโซ่ลำเลียง', 7, 3]
    ].map(([id, asset, task, intervalDays, d]) => ({ id, asset, task, intervalDays, dueDate: due(d) })),
    parts: [
      ['FAN-RF-200W', 'มอเตอร์พัดลมหมุนเวียน รีโฟลว์', 'B-11', 0, 1, 2],
      ['NZL-1005', 'หัวดูด ขนาด 1005', 'A-02', 2, 6, 12],
      ['FLT-N2-01', 'ไส้กรองอากาศ เครื่อง N2', 'C-04', 1, 2, 4],
      ['SQG-300', 'ใบปาด 300 มม.', 'A-07', 2, 2, 4],
      ['FLT-FX-02', 'ไส้กรองไอฟลักซ์', 'B-03', 2, 4, 8],
      ['HTR-RF-1.5K', 'ฮีตเตอร์รีโฟลว์ 1.5 kW', 'B-12', 4, 4, 6],
      ['FLT-NZ-04', 'ไส้กรองหัวดูด', 'A-03', 16, 8, 24],
      ['CHN-RF-08', 'โซ่ลำเลียงรีโฟลว์', 'D-01', 1, 1, 2]
    ].map(([id, name, bin, qty, min, max]) => ({ id, name, bin, qty, min, max, unit: /^(FLT|NZL)/.test(id) ? 'ชิ้น' : /^CHN/.test(id) ? 'เส้น' : 'ชิ้น' })),
    // เครื่องมือวัด (ISO 9001 ข้อ 7.1.5): status ok ใช้งานได้, hold ห้ามใช้
    gauges: [
      ['GAU-001', 'ไมโครมิเตอร์', '0–25 มม.', 'QC ไลน์ SMT 1', 365, 65, 'ok'],
      ['GAU-002', 'เวอร์เนียร์คาลิปเปอร์', '0–150 มม.', 'ห้องซ่อมบำรุง', 365, -5, 'ok'],
      ['GAU-003', 'เกจวัดแรงดันสุญญากาศหัวดูด', '-100–0 kPa', 'MNT-103', 180, 12, 'ok'],
      ['GAU-004', 'เครื่องวัดโปรไฟล์อุณหภูมิรีโฟลว์', '0–350 °C', 'ไลน์ SMT 1', 365, 20, 'ok'],
      ['GAU-005', 'มัลติมิเตอร์', '1000 V / 10 A', 'ห้องซ่อมบำรุง', 365, 140, 'ok'],
      ['GAU-006', 'เกจวัดแรงดันลม', '0–10 bar', 'CMP-901', 365, 200, 'hold'],
      ['GAU-007', 'ทอร์กไขควง', '0.1–1.2 N·m', 'ห้องซ่อมบำรุง', 180, 90, 'ok']
    ].map(([id, name, range, location, intervalDays, d, status]) => ({
      id, name, range, location, intervalDays, status, dueDate: due(d), lastCal: due(d) - intervalDays * DAY,
      note: status === 'hold' ? 'ค่าคลาดเกินเกณฑ์ตอนตรวจเทียบกับเกจมาตรฐาน รอส่งสอบเทียบ' : ''
    })),
    tpmState: {},
    inspections: [],
    stockMoves: [],
    seq: 52
  };
}

/* ---------- โหมดตัวอย่าง: เก็บในเบราว์เซอร์เครื่องนี้ ---------- */
/* ---------- ล็อกอินด้วยรหัสพนักงาน ----------
   Firebase ต้องมีอีเมล จึงสร้างอีเมลเบื้องหลังที่ไม่มีใครใช้จริง และเก็บคู่ รหัสพนักงาน → อีเมล ไว้ใน logins/{รหัส} */
export const EMP_RE = /^[A-Z0-9][A-Z0-9._-]{1,19}$/;
export const normEmpId = (s) => String(s || '').trim().toUpperCase();
export function checkEmpId(s) {
  const id = normEmpId(s);
  if (!EMP_RE.test(id)) throw new Error('รหัสพนักงานใช้ได้เฉพาะ A-Z 0-9 . _ - ความยาว 2–20 ตัวอักษร');
  return id;
}
const rand = (n, chars) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => chars[x % chars.length]).join('');
const loginEmail = (empId) => `${empId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${rand(6, 'abcdefghijkmnpqrstuvwxyz23456789')}@cmms.example.com`;
// ตัด 0/O 1/I/L ออก อ่านบอกกันได้ไม่สับสน
export const tempPassword = () => rand(8, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');

class LocalBackend {
  mode = 'local';
  listeners = {};

  constructor() {
    this.db = this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(DEMO_KEY));
      if (saved) {
        // ข้อมูลตัวอย่างที่บันทึกไว้ก่อนมีใบตรวจ TPM: เติมส่วนที่ขาด
        if (!saved.checklists) {
          const fresh = sampleData();
          saved.checklists = fresh.checklists;
          saved.assets = saved.assets.map((x) => ({ ...x, wi: x.wi ?? fresh.assets.find((f) => f.id === x.id)?.wi ?? '' }));
        }
        saved.tpmState ||= {};
        saved.stockMoves ||= [];
        saved.inspections ||= [];
        return saved;
      }
    } catch { /* เปิดใหม่จากข้อมูลตัวอย่าง */ }
    return sampleData();
  }

  commit(...colls) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.db)); } catch { /* ใช้ในหน่วยความจำต่อ */ }
    colls.forEach((c) => (this.listeners[c] || []).forEach((cb) => cb(structuredClone(this.db[c]))));
  }

  onAuth(cb) {
    cb({ uid: 'demo', name: 'อนันต์ ส.', role: 'admin', empId: 'DEMO' });
    return () => {};
  }

  async signIn() {}
  async signOut() {}
  async getSetup() { return { plant: 'โรงงานตัวอย่าง', dept: 'ซ่อมบำรุง', demo: true }; }
  async changePassword() { throw new Error('โหมดตัวอย่างไม่ใช้รหัสผ่าน'); }
  async resetUser() { throw new Error('โหมดตัวอย่างไม่รองรับการรีเซ็ตรหัสผ่าน กรุณาเชื่อมต่อ Firebase ก่อน'); }
  async createUser() { throw new Error('โหมดตัวอย่างไม่รองรับการเพิ่มผู้ใช้ กรุณาเชื่อมต่อ Firebase ก่อน'); }
  async updateUser() { throw new Error('โหมดตัวอย่างไม่รองรับการแก้ไขผู้ใช้ กรุณาเชื่อมต่อ Firebase ก่อน'); }
  async deleteUser() { throw new Error('โหมดตัวอย่างไม่รองรับการลบบัญชี กรุณาเชื่อมต่อ Firebase ก่อน'); }
  async updateSetup() { throw new Error('โหมดตัวอย่างไม่รองรับการแก้ไขข้อมูลโรงงาน'); }
  subscribeUsers(cb) {
    cb([['demo', 'อนันต์ ส.', 'admin', 'DEMO', 'asst_manager'], ['u2', 'วิชัย ร.', 'tech', 'M0112', 'machine'], ['u3', 'สมชาย ก.', 'tech', 'M0127', 'design'], ['u4', 'มาลี ท.', 'operator', 'P0451', 'document'], ['u5', 'ประเสริฐ บ.', 'admin', 'P0466', 'advisor']]
      .map(([id, name, role, empId, position]) => ({ id, name, role, empId, position })));
    return () => {};
  }

  async importRows(coll, rows) {
    const map = new Map(this.db[coll].map((x) => [x.id, x]));
    rows.forEach((r) => map.set(r.id, { ...(map.get(r.id) || {}), ...r }));
    this.db[coll] = [...map.values()];
    this.commit(coll);
  }

  subscribe(coll, cb) {
    (this.listeners[coll] ||= []).push(cb);
    cb(structuredClone(this.db[coll]));
    return () => { this.listeners[coll] = this.listeners[coll].filter((x) => x !== cb); };
  }

  async createWorkOrder(data) {
    const id = workOrderId(++this.db.seq);
    this.db.workOrders.unshift(normalizeWorkOrder(data, id));
    this.commit('workOrders');
    return id;
  }

  async updateWorkOrder(id, patch) {
    this.db.workOrders = this.db.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w));
    this.commit('workOrders');
  }

  async put(coll, id, data) {
    const docId = id ?? `${coll}-${Date.now()}`;
    this.db[coll] = [...this.db[coll].filter((x) => x.id !== docId), { ...data, id: docId }];
    this.commit(coll);
  }

  async remove(coll, id) {
    this.db[coll] = this.db[coll].filter((x) => x.id !== id);
    this.commit(coll);
  }

  async update(coll, id, patch) {
    this.db[coll] = this.db[coll].map((x) => (x.id === id ? { ...x, ...patch } : x));
    this.commit(coll);
  }

  async adjustPart(id, delta) {
    this.db.parts = this.db.parts.map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p));
    this.commit('parts');
  }

  // เบิกอะไหล่เข้าใบงาน: ตัดสต็อกและบันทึกในใบงานพร้อมกัน
  async issuePart(woId, partId, qty, text) {
    const part = this.db.parts.find((p) => p.id === partId);
    const wo = this.db.workOrders.find((w) => w.id === woId);
    if (!part || !wo) throw new Error('ไม่พบอะไหล่หรือใบงาน');
    if (part.qty < qty) throw new Error(`คงเหลือ ${part.qty} ไม่เพียงพอสำหรับการเบิก ${qty}`);
    part.qty -= qty;
    this.db.stockMoves = [{ id: `mv-${Date.now()}`, part: partId, dir: 'out', qty, ref: woId, note: 'เบิกเข้าใบงาน', by: text.split(' เบิก')[0], at: Date.now(), after: part.qty }, ...(this.db.stockMoves || [])].slice(0, 300);
    wo.partsUsed = mergeParts(wo.partsUsed, partId, qty);
    wo.log = [...(wo.log || []), { at: Date.now(), text }];
    this.commit('parts', 'workOrders', 'stockMoves');
  }

  // รับเข้าหรือเบิกออกพร้อมเลขที่อ้างอิง และเก็บประวัติการเคลื่อนไหว
  async moveStock({ part: id, dir, qty, ref, note, by }) {
    const part = this.db.parts.find((p) => p.id === id);
    if (!part) throw new Error('ไม่พบอะไหล่');
    if (dir === 'out' && part.qty < qty) throw new Error(`คงเหลือ ${part.qty} ไม่เพียงพอสำหรับการเบิก ${qty}`);
    part.qty += dir === 'in' ? qty : -qty;
    this.db.stockMoves = [{ id: `mv-${Date.now()}`, part: id, dir, qty, ref, note, by, at: Date.now(), after: part.qty }, ...(this.db.stockMoves || [])].slice(0, 300);
    this.commit('parts', 'stockMoves');
  }

  async completePM(id, doneBy) {
    const plan = this.db.pmPlans.find((p) => p.id === id);
    if (!plan) return;
    const wo = pmWorkOrder(plan, doneBy, workOrderId(++this.db.seq));
    plan.dueDate = startOfToday() + plan.intervalDays * DAY;
    plan.lastDone = Date.now();
    this.db.workOrders.unshift(wo);
    this.commit('pmPlans', 'workOrders');
  }

  async calibrate(id, pass, note) {
    const g = this.db.gauges.find((x) => x.id === id);
    if (!g) return;
    Object.assign(g, calibrationPatch(g, pass, note));
    this.commit('gauges');
  }

  async isEmpty() { return false; }
  async seed() {}

  // ผลตรวจ TPM: tpmState เก็บวันที่ตรวจล่าสุดของแต่ละจุด inspections เป็นประวัติ
  async getTpmState(asset) {
    return structuredClone((this.db.tpmState || {})[asset] || { last: {} });
  }

  async recordInspection(rec) {
    this.db.inspections = [...(this.db.inspections || []), { ...rec, id: `insp-${Date.now()}` }];
    const cur = (this.db.tpmState ||= {})[rec.asset] || { last: {} };
    rec.results.forEach((r) => { cur.last[r.i] = rec.at; });
    this.db.tpmState[rec.asset] = { ...cur, lastAt: rec.at, lastBy: rec.by, ng: rec.results.filter((r) => !r.ok).length };
    this.commit();
  }

  reset() {
    this.db = sampleData();
    this.commit(...COLLECTIONS);
  }
}

export const COLLECTIONS = ['assets', 'workOrders', 'pmPlans', 'parts', 'gauges', 'checklists', 'stockMoves'];

function mergeParts(list = [], id, qty) {
  const found = list.find((x) => x.id === id);
  return found ? list.map((x) => (x.id === id ? { ...x, qty: x.qty + qty } : x)) : [...list, { id, qty }];
}

function calibrationPatch(g, pass, note) {
  const now = Date.now();
  return pass
    ? { status: 'ok', lastCal: now, dueDate: startOfToday() + g.intervalDays * DAY, note: note || '' }
    : { status: 'hold', note: note || 'ไม่ผ่านการสอบเทียบ' };
}

function normalizeWorkOrder(data, id) {
  const now = Date.now();
  return {
    id, asset: data.asset, type: data.type, title: data.title, priority: data.priority || '',
    status: data.status ?? 'pending', startAt: data.startAt ?? now, endAt: data.endAt ?? null,
    tech: data.tech ?? '', requestedBy: data.requestedBy ?? '', requestedUid: data.requestedUid ?? '', approvedBy: '', approvedAt: null,
    team: data.team ?? (data.tech ? [data.tech] : []), dueDate: data.dueDate ?? null, checks: data.checks ?? [], note: data.note ?? '', photo: data.photo ?? '',
    cause: '', action: '', partsUsed: [], log: data.log ?? [{ at: now, text: `${data.requestedBy || 'ผู้ใช้'} แจ้งซ่อม` }]
  };
}

// onTime: ทำภายในวันครบกำหนดหรือก่อน ใช้คิด PM compliance
function pmWorkOrder(plan, doneBy, id) {
  const now = Date.now();
  return {
    id, asset: plan.asset, type: 'pm', title: plan.task, status: 'done', startAt: now, endAt: now,
    tech: doneBy, requestedBy: 'แผน PM', approvedBy: doneBy, approvedAt: now, cause: 'PM', action: 'ทำตามแผน',
    partsUsed: [], onTime: plan.dueDate >= startOfToday(), planDue: plan.dueDate,
    log: [{ at: now, text: `${doneBy} บันทึก PM ตามแผน` }]
  };
}

/* ---------- Firebase: Firestore + Authentication ---------- */
class FirebaseBackend {
  mode = 'firebase';

  constructor(config) {
    this.config = config;
  }

  async init() {
    const [appMod, fs, authMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-firestore.js`),
      import(`${SDK}/firebase-auth.js`)
    ]);
    this.fs = fs;
    this.authMod = authMod;
    this.appMod = appMod;
    const app = appMod.initializeApp(this.config);
    this.emulator = new URLSearchParams(location.search).get('emulator') === '1' && location.hostname === 'localhost';
    this.projectId = this.config.projectId;
    const emulator = new URLSearchParams(location.search).get('emulator') === '1' && location.hostname === 'localhost';
    // แคชลงเครื่อง: เปิดดูข้อมูลล่าสุดได้แม้สัญญาณในโรงงานหลุด
    this.db = emulator
      ? fs.initializeFirestore(app, {})
      : fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    this.auth = authMod.getAuth(app);
    if (emulator) {
      fs.connectFirestoreEmulator(this.db, '127.0.0.1', 8080);
      authMod.connectAuthEmulator(this.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    return this;
  }

  onAuth(cb) {
    this.authCb = cb;
    return this.authMod.onAuthStateChanged(this.auth, (user) => this.emitUser(user));
  }

  // อ่านสิทธิ์จาก users/{uid} สิทธิ์ disabled หรือไม่มีเอกสาร = เข้าใช้ไม่ได้
  async emitUser(user) {
    if (!this.authCb) return;
    if (!user) return this.authCb(null);
    const { doc, getDoc } = this.fs;
    let profile = {};
    try {
      const snap = await getDoc(doc(this.db, 'users', user.uid));
      profile = snap.exists() ? snap.data() : {};
    } catch (err) {
      console.warn('อ่านสิทธิ์ผู้ใช้ไม่ได้', err);
    }
    const role = ['admin', 'tech', 'operator'].includes(profile.role) ? profile.role : null;
    this.authCb({ uid: user.uid, empId: profile.empId || '', name: profile.name || profile.empId || 'ผู้ใช้', role, position: profile.position || '', disabled: profile.role === 'disabled', mustChange: !!profile.mustChange });
  }

  async getSetup() {
    const { doc, getDoc } = this.fs;
    const snap = await getDoc(doc(this.db, 'config', 'setup'));
    return snap.exists() ? snap.data() : null;
  }

  // ตั้งค่าครั้งแรก: บัญชีแรกเป็นแอดมิน และล็อกไม่ให้ใครตั้งซ้ำ (กฎใน firestore.rules บังคับ)
  async setupFirstAdmin({ plant, dept = '', name, empId, password }) {
    const { doc, writeBatch, serverTimestamp } = this.fs;
    empId = checkEmpId(empId);
    const email = loginEmail(empId);
    const cred = await this.authMod.createUserWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;
    const write = () => {
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'users', uid), { name, empId, role: 'admin', createdAt: serverTimestamp() });
      batch.set(doc(this.db, 'config', 'setup'), { plant, dept, adminUid: uid, createdAt: serverTimestamp() });
      batch.set(doc(this.db, 'logins', empId), { email, uid });
      return batch.commit();
    };
    try {
      // รอให้ฐานข้อมูลได้รับสิทธิ์ของบัญชีที่เพิ่งสร้างก่อน ถ้ายังไม่ทันจะถูกปฏิเสธ จึงลองซ้ำอีก 2 ครั้ง
      await cred.user.getIdToken(true);
      for (let i = 0; ; i++) {
        try {
          await write();
          break;
        } catch (err) {
          if (err?.code !== 'permission-denied' || i >= 2) throw err;
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    } catch (err) {
      // บันทึกสิทธิ์ไม่สำเร็จ ลบบัญชีที่เพิ่งสร้างทิ้ง จะได้ลองใหม่ได้
      console.error('ตั้งค่าครั้งแรกไม่สำเร็จ', err);
      await this.authMod.deleteUser(cred.user).catch(() => {});
      throw err;
    }
  }

  refreshUser() {
    return this.emitUser(this.auth.currentUser);
  }

  updateSetup(patch) {
    const { doc, updateDoc } = this.fs;
    return updateDoc(doc(this.db, 'config', 'setup'), patch);
  }

  // สร้างบัญชีล็อกอินด้วยแอปสำรอง แอดมินจึงไม่หลุดออกจากระบบ
  // write(uid, email) บันทึกเอกสาร ถ้าบันทึกไม่ผ่านจะลบบัญชีที่เพิ่งสร้างทิ้ง
  async withNewAccount(empId, password, write) {
    const sec = this.appMod.initializeApp(this.config, `acct-${Date.now()}`);
    const secAuth = this.authMod.getAuth(sec);
    if (this.emulator) this.authMod.connectAuthEmulator(secAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    try {
      const email = loginEmail(empId);
      const cred = await this.authMod.createUserWithEmailAndPassword(secAuth, email, password);
      try {
        await write(cred.user.uid, email);
      } catch (err) {
        await this.authMod.deleteUser(cred.user).catch(() => {});
        throw err;
      }
      await this.authMod.signOut(secAuth);
    } finally {
      await this.appMod.deleteApp(sec);
    }
  }

  // คืนรหัสผ่านชั่วคราวให้แอดมินแจ้งพนักงาน พนักงานต้องตั้งรหัสใหม่ตอนเข้าครั้งแรก
  async createUser({ name, empId, role, position = '' }) {
    const { doc, getDoc, writeBatch, serverTimestamp } = this.fs;
    empId = checkEmpId(empId);
    if ((await getDoc(doc(this.db, 'logins', empId))).exists()) throw new Error(`มีรหัสพนักงาน ${empId} อยู่แล้ว`);
    const temp = tempPassword();
    await this.withNewAccount(empId, temp, (uid, email) => {
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'users', uid), { name, empId, role, position, mustChange: true, createdAt: serverTimestamp() });
      batch.set(doc(this.db, 'logins', empId), { email, uid });
      return batch.commit();
    });
    return temp;
  }

  // รีเซ็ตรหัสผ่านโดยไม่ใช้อีเมล: สร้างบัญชีล็อกอินใหม่ให้รหัสพนักงานเดิม แล้วย้ายข้อมูลผู้ใช้ไป
  // บัญชีเก่าใช้ต่อไม่ได้ เพราะไม่มีเอกสารใน users แล้ว (กฎ isMember)
  // ลบบัญชี: ลบข้อมูลผู้ใช้และรหัสพนักงานที่ผูกไว้ บุคคลนั้นจะเข้าสู่ระบบไม่ได้อีก
  // (บัญชีเบื้องหลังใน Firebase Authentication ยังค้างอยู่ ลบจากหน้าเว็บไม่ได้ แต่ใช้เข้าระบบไม่ได้แล้ว)
  async deleteUser(uid) {
    const { doc, getDoc, writeBatch } = this.fs;
    if (uid === this.auth.currentUser?.uid) throw new Error('ไม่สามารถลบบัญชีของตัวเองได้');
    const snap = await getDoc(doc(this.db, 'users', uid));
    if (!snap.exists()) throw new Error('ไม่พบผู้ใช้นี้');
    const { empId } = snap.data();
    const batch = writeBatch(this.db);
    if (empId) {
      const login = await getDoc(doc(this.db, 'logins', empId));
      if (login.exists() && login.data().uid === uid) batch.delete(doc(this.db, 'logins', empId));
    }
    batch.delete(doc(this.db, 'users', uid));
    await batch.commit();
  }

  async resetUser(uid) {
    const { doc, getDoc, writeBatch, serverTimestamp } = this.fs;
    const snap = await getDoc(doc(this.db, 'users', uid));
    if (!snap.exists()) throw new Error('ไม่พบผู้ใช้นี้');
    const profile = snap.data();
    if (!profile.empId) throw new Error('ผู้ใช้นี้ไม่มีรหัสพนักงาน');
    const temp = tempPassword();
    await this.withNewAccount(profile.empId, temp, (newUid, email) => {
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'users', newUid), { ...profile, mustChange: true, resetAt: serverTimestamp() });
      batch.set(doc(this.db, 'logins', profile.empId), { email, uid: newUid });
      batch.delete(doc(this.db, 'users', uid));
      return batch.commit();
    });
    return temp;
  }

  // current = รหัสเดิม (ไม่ใส่ได้ตอนเพิ่งล็อกอินด้วยรหัสชั่วคราว)
  async changePassword(current, next) {
    const { doc, updateDoc } = this.fs;
    const user = this.auth.currentUser;
    if (!user) throw new Error('ยังไม่ได้เข้าสู่ระบบ');
    if (current) {
      const cred = this.authMod.EmailAuthProvider.credential(user.email, current);
      await this.authMod.reauthenticateWithCredential(user, cred);
    }
    await this.authMod.updatePassword(user, next);
    await updateDoc(doc(this.db, 'users', user.uid), { mustChange: false });
    await this.refreshUser();
  }

  updateUser(uid, patch) {
    const { doc, updateDoc } = this.fs;
    return updateDoc(doc(this.db, 'users', uid), patch);
  }

  subscribeUsers(cb, onError) {
    const { collection, onSnapshot } = this.fs;
    return onSnapshot(collection(this.db, 'users'), (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))), onError);
  }

  // นำเข้าทีละไม่เกิน 400 แถวต่อ batch (Firestore จำกัด 500 การเขียนต่อครั้ง)
  async importRows(coll, rows) {
    const { doc, writeBatch } = this.fs;
    for (let i = 0; i < rows.length; i += 400) {
      const batch = writeBatch(this.db);
      rows.slice(i, i + 400).forEach(({ id, ...rest }) => batch.set(doc(this.db, coll, id), rest, { merge: true }));
      await batch.commit();
    }
  }

  // หาอีเมลเบื้องหลังจากรหัสพนักงาน ถ้าไม่มีให้ตอบเหมือนรหัสผ่านผิด จะได้เดารายชื่อไม่ได้
  async signIn(empId, password) {
    const { doc, getDoc } = this.fs;
    const id = normEmpId(empId);
    const bad = () => Object.assign(new Error('invalid'), { code: 'auth/invalid-credential' });
    if (!EMP_RE.test(id)) throw bad();
    const snap = await getDoc(doc(this.db, 'logins', id));
    if (!snap.exists()) throw bad();
    await this.authMod.signInWithEmailAndPassword(this.auth, snap.data().email, password);
  }

  signOut() {
    return this.authMod.signOut(this.auth);
  }

  subscribe(coll, cb, onError) {
    const { collection, query, orderBy, limit, onSnapshot } = this.fs;
    const ref = collection(this.db, coll);
    // จำกัดจำนวนใบงานที่ฟังแบบเรียลไทม์ เพื่อไม่ให้โควตาการอ่านโตตามอายุระบบ
    const q = coll === 'workOrders' ? query(ref, orderBy('startAt', 'desc'), limit(300))
      : coll === 'stockMoves' ? query(ref, orderBy('at', 'desc'), limit(100)) : ref;
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))), onError);
  }

  // เลขใบงานมาจากตัวนับใน transaction จึงไม่ซ้ำแม้แจ้งซ่อมพร้อมกันหลายเครื่อง
  nextId(tx, snap) {
    const seq = (snap.exists() ? snap.data().seq : 0) + 1;
    tx.set(snap.ref, { seq });
    return workOrderId(seq);
  }

  async createWorkOrder(data) {
    const { doc, runTransaction, serverTimestamp } = this.fs;
    return runTransaction(this.db, async (tx) => {
      const counter = await tx.get(doc(this.db, 'counters', 'workOrders'));
      const id = this.nextId(tx, counter);
      const { id: _drop, ...rest } = normalizeWorkOrder(data, id);
      tx.set(doc(this.db, 'workOrders', id), { ...rest, createdAt: serverTimestamp() });
      return id;
    });
  }

  updateWorkOrder(id, patch) {
    const { doc, updateDoc } = this.fs;
    return updateDoc(doc(this.db, 'workOrders', id), patch);
  }

  put(coll, id, data) {
    const { doc, collection, setDoc } = this.fs;
    const ref = id ? doc(this.db, coll, id) : doc(collection(this.db, coll));
    return setDoc(ref, data);
  }

  remove(coll, id) {
    const { doc, deleteDoc } = this.fs;
    return deleteDoc(doc(this.db, coll, id));
  }

  update(coll, id, patch) {
    const { doc, updateDoc } = this.fs;
    return updateDoc(doc(this.db, coll, id), patch);
  }

  async moveStock({ part: id, dir, qty, ref, note, by }) {
    const { doc, collection, runTransaction } = this.fs;
    await runTransaction(this.db, async (tx) => {
      const pRef = doc(this.db, 'parts', id);
      const p = await tx.get(pRef);
      if (!p.exists()) throw new Error('ไม่พบอะไหล่');
      const cur = p.data().qty;
      if (dir === 'out' && cur < qty) throw new Error(`คงเหลือ ${cur} ไม่เพียงพอสำหรับการเบิก ${qty}`);
      const after = dir === 'in' ? cur + qty : cur - qty;
      tx.update(pRef, { qty: after });
      tx.set(doc(collection(this.db, 'stockMoves')), { part: id, dir, qty, ref, note, by, at: Date.now(), after });
    });
  }

  async issuePart(woId, partId, qty, text) {
    const { doc, collection, runTransaction } = this.fs;
    await runTransaction(this.db, async (tx) => {
      const pRef = doc(this.db, 'parts', partId);
      const wRef = doc(this.db, 'workOrders', woId);
      const [p, w] = [await tx.get(pRef), await tx.get(wRef)];
      if (!p.exists() || !w.exists()) throw new Error('ไม่พบอะไหล่หรือใบงาน');
      if (p.data().qty < qty) throw new Error(`คงเหลือ ${p.data().qty} ไม่เพียงพอสำหรับการเบิก ${qty}`);
      tx.update(pRef, { qty: p.data().qty - qty });
      tx.update(wRef, { partsUsed: mergeParts(w.data().partsUsed, partId, qty), log: [...(w.data().log || []), { at: Date.now(), text }] });
      tx.set(doc(collection(this.db, 'stockMoves')), { part: partId, dir: 'out', qty, ref: woId, note: 'เบิกเข้าใบงาน', by: text.split(' เบิก')[0], at: Date.now(), after: p.data().qty - qty });
    });
  }

  async calibrate(id, pass, note) {
    const { doc, getDoc, updateDoc } = this.fs;
    const ref = doc(this.db, 'gauges', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ไม่พบเครื่องมือวัด');
    await updateDoc(ref, calibrationPatch(snap.data(), pass, note));
  }

  async adjustPart(id, delta) {
    const { doc, runTransaction } = this.fs;
    await runTransaction(this.db, async (tx) => {
      const ref = doc(this.db, 'parts', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('ไม่พบอะไหล่');
      tx.update(ref, { qty: Math.max(0, snap.data().qty + delta) });
    });
  }

  async completePM(id, doneBy) {
    const { doc, runTransaction, serverTimestamp } = this.fs;
    await runTransaction(this.db, async (tx) => {
      const planRef = doc(this.db, 'pmPlans', id);
      const counter = await tx.get(doc(this.db, 'counters', 'workOrders'));
      const plan = await tx.get(planRef);
      if (!plan.exists()) throw new Error('ไม่พบแผน PM');
      const p = plan.data();
      const woId = this.nextId(tx, counter);
      const { id: _drop, ...rest } = pmWorkOrder(p, doneBy, woId);
      tx.update(planRef, { dueDate: startOfToday() + p.intervalDays * DAY, lastDone: Date.now() });
      tx.set(doc(this.db, 'workOrders', woId), { ...rest, createdAt: serverTimestamp() });
    });
  }

  async getTpmState(asset) {
    const { doc, getDoc } = this.fs;
    const snap = await getDoc(doc(this.db, 'tpmState', asset));
    return snap.exists() ? { last: {}, ...snap.data() } : { last: {} };
  }

  // บันทึกประวัติและวันที่ตรวจล่าสุดของแต่ละจุดพร้อมกัน
  async recordInspection(rec) {
    const { doc, collection, writeBatch } = this.fs;
    const batch = writeBatch(this.db);
    batch.set(doc(collection(this.db, 'inspections')), rec);
    const last = {};
    rec.results.forEach((r) => { last[r.i] = rec.at; });
    batch.set(doc(this.db, 'tpmState', rec.asset), { last, lastAt: rec.at, lastBy: rec.by, ng: rec.results.filter((r) => !r.ok).length }, { merge: true });
    await batch.commit();
  }

  async isEmpty() {
    const { collection, getDocs, limit, query } = this.fs;
    const snap = await getDocs(query(collection(this.db, 'assets'), limit(1)));
    return snap.empty;
  }

  async seed() {
    const { doc, writeBatch, serverTimestamp } = this.fs;
    const data = sampleData();
    const batch = writeBatch(this.db);
    COLLECTIONS.forEach((c) => {
      data[c].forEach(({ id, ...rest }) => {
        batch.set(doc(this.db, c, id), c === 'workOrders' ? { ...rest, createdAt: serverTimestamp() } : rest);
      });
    });
    batch.set(doc(this.db, 'counters', 'workOrders'), { seq: data.seq });
    await batch.commit();
  }
}

/* ---------- เลือกโหมด ---------- */
export function savedConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY));
  } catch {
    return null;
  }
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearConfig() {
  try { localStorage.removeItem(CONFIG_KEY); } catch { /* ไม่มีอะไรต้องลบ */ }
}

// รับได้ทั้ง JSON และโค้ด const firebaseConfig = {...} ที่คัดลอกจาก console
export function parseConfig(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('ไม่พบ { ... } ในข้อความ');
  const json = match[0]
    .replace(/\/\/.*$/gm, '')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*}/g, '}');
  const config = JSON.parse(json);
  ['apiKey', 'projectId', 'appId'].forEach((k) => {
    if (!config[k]) throw new Error(`ค่า ${k} หายไป`);
  });
  return config;
}

export async function createBackend() {
  const config = fileConfig || savedConfig();
  if (!config) return new LocalBackend();
  return new FirebaseBackend(config).init();
}
