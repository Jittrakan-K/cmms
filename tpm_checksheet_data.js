/**
 * TPM Checksheet Templates Master Data (Extracted directly from CHECKSHEET/OPTIC/*.xlsx)
 * Total Checksheet Types: 31 Optical Machines
 * Orbray (Thailand) Co., Ltd.
 * 
 * Accurately synced with all 31 Excel standard documents in CHECKSHEET/OPTIC/
 * - 22 Operator-only checksheets
 * - 9 Dual checksheets (Operator + Technician)
 */
window.TPM_CHECKSHEET_TEMPLATES = [
  {
    "wiNo": "WI-TPM-OPT-001",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Rotation plate",
          "checkTitle": "1.1 การหมุนจะต้องไม่ติดขัด"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Electric part",
          "checkTitle": "2.1 หลอดไฟจะต้องไม่ขาด"
        },
        {
          "no": "",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Electric part",
          "checkTitle": "2.2 Switch Start , Stop จะต้องไม่แตกหัก"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Display",
          "checkTitle": "3.1 จะต้องแสดงตัวอักษรไม่ผิดเพี้ยน"
        },
        {
          "no": "4",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body",
          "checkTitle": "4.1 จะต้องไม่มีฝุ่น"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Rotation Plate",
          "checkTitle": "5.1 จะต้องไม่มีฝุ่น"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "CBS",
    "technicianSheet": null,
    "issueDate": "43060",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-001 _ CBS-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "CBS  - 002",
    "hasTechnicianSheet": false,
    "machineName": "CENTRIFUGAL BUBBLE SEPARATOR"
  },
  {
    "wiNo": "WI-TPM-OPT-002",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 9,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Rubber roller (Upper/Lower)(ลูกกลิ้ง)",
          "checkTitle": "1.1 ต้องไม่มีร่องที่เกิดจากการสึกของลูกกลิ้ง"
        },
        {
          "no": "2",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "เครื่องจักรและบริเวณโดยรอบ",
          "checkTitle": "2.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Blade (ใบมีด)",
          "checkTitle": "3.1 จะต้องไม่มีการบิ่น,การสึกที่ภาพรวมของใบมีด"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Rubber roller (Upper/Lower)(Bearing)(Bearing ลูกปืน)",
          "checkTitle": "4.1 เมื่อหมุน จะต้องไม่มีเสียงหรือการสั่นที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Control pressure (ตัวปรับแรงดัน)",
          "checkTitle": "5.1 แรงดันลมไม่เกิน (0.36 Mpa - 0.4 Mpa MAX)"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Cutting pressure (แรงดัน ของการตัด)",
          "checkTitle": "6.1 แรงดันลมไม่เกิน (0.25 Mpa)"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Filter regulator (ตัวกรอง)",
          "checkTitle": "7.1 ตัวกรองต้องไม่อุดตัน"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Cylinder (กระบอกสูบ)",
          "checkTitle": "8.1 ต้องไม่มีการทำงานที่ผิดปกติ หรือมีลมรั่ว"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch (สวิตซ์)",
          "checkTitle": "9.1 ต้องไม่ชำรุดเสียหายและต้องไม่ทำงานผิดปกติ"
        }
      ]
    },
    "issueRevision": "2",
    "docNo": "QR-PT-046-D",
    "prefix": "LOC",
    "technicianSheet": {
      "wiNo": "WI-TPM-FR-002",
      "itemCount": 2,
      "issueRevision": "2",
      "issueDate": "45856",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Belt(สายพาน)",
          "checkTitle": "1.1 ต้องไม่มีการแตก, สึก, หละหลวม"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "DC motor(มอเตอร์)",
          "checkTitle": "2.1 ต้องไม่มีเสียงหรือการสั่นที่ผิดปกติ"
        }
      ]
    },
    "issueDate": "45856",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-002 _ LOC -XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LOC - 0 0 1",
    "hasTechnicianSheet": true,
    "machineName": "FIBER CUTTING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-003",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 4,
      "items": [
        {
          "no": "1",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "เครื่องจักรและบริเวณโดยรอบ",
          "checkTitle": "1.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Main shaft (แกนหมุ่น)",
          "checkTitle": "2.1 ต้องไม่มีเสียงและการสั่นที่ผิดปกติ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Arm (อาร์ม)",
          "checkTitle": "3.1 รูต้องไม่สึก, Arm ต้องไม่เสียรูปทรง"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch, Volume (สวิตซ์,ปุ่มปรับความเร็ว)",
          "checkTitle": "4.1 ต้องไม่มีการชำรุดเสียหายและ Abnormal operation"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "ABM",
    "technicianSheet": {
      "wiNo": "WI-TPM-FR-003",
      "itemCount": 2,
      "issueRevision": "1",
      "issueDate": "43890",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Motor",
          "checkTitle": "1.1 ต้องไม่มีเสียงและการสั่นที่ผิดปกติ"
        },
        {
          "no": "",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Motor",
          "checkTitle": "1.2 ต้องไม่มีความผิดปกติที่การหมุน"
        }
      ]
    },
    "issueDate": "43890",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-003 _ ABM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "ABM - 001",
    "hasTechnicianSheet": true,
    "machineName": "ABHESIVE REMOVING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-004",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 8,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Main Shaft  (แกนหมุน)",
          "checkTitle": "1.1 ต้องไม่มีเสียงและการสั่นที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Boby (เครื่องจักรและบริเวณโดยรอบ)",
          "checkTitle": "2.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "3",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "3.1 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Center pin (2pcs)  (เซ็นเซอร์ พิน)",
          "checkTitle": "4.1 ต้องไม่สึก"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Timer (ที่ตั้งเวลา)",
          "checkTitle": "5.1 ต้องไม่มีปัญหาที่การทำงาน"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch (สวิตซ์)",
          "checkTitle": "6.1 ต้องไม่มีการชำรุดเสียหายและ Abnormal operation"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Drainage hose ( ท่อระบายน้ำ )",
          "checkTitle": "7.1 ต้องไม่มีการอุดตัน"
        },
        {
          "no": "8",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Drainage hose ( ท่อระบายน้ำ )",
          "checkTitle": "8.1 ต้องไม่มีการอุดตัน"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "XGM",
    "technicianSheet": {
      "wiNo": "WI-TPM-FR-004",
      "itemCount": 6,
      "issueRevision": "1",
      "issueDate": "46009",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Motor(มอเตอร์)",
          "checkTitle": "1.1 ต้องไม่มีเสียงและการสั่นที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Belt(สายพาน)",
          "checkTitle": "2.1 ต้องไม่มีการหลวม, แตกร้าว, สนิม"
        },
        {
          "no": "3",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Speed reducer (เฟืองทดความเร็ว)",
          "checkTitle": "3.1 ต้องไม่มีเสียงและการสั่นที่ผิดปกติรวมทั้ง oil รั่ว"
        },
        {
          "no": "4",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Inverter(ที่ควบคุมมอเตอร์)",
          "checkTitle": "4.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<<จุดทำความสะอาด  >>",
          "period": "เดือน",
          "item": "Speed reducer (เฟืองทดความเร็ว)",
          "checkTitle": "5.1 ต้องไม่มีน้ำมันที่เสื่อมสภาพ"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "เดือน",
          "item": "Motor(มอเตอร์)",
          "checkTitle": "6.1 จะต้องอยู่ในระดับที่กำหนด"
        }
      ]
    },
    "issueDate": "46009",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-004 _ XGM-XXXx.xlsx",
    "factory": "",
    "machineCodeRaw": "XGM - 0 0 4",
    "hasTechnicianSheet": true,
    "machineName": "BIAXIAL POLISHING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-005",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 14,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Linear gauge (ตัววัดระยะ)",
          "checkTitle": "1.1 ต้องไม่มีความผิดปกติที่ค่าการวัด"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Projector device (เครื่องฉายไฟ)",
          "checkTitle": "2.1 ต้องไม่มีความผิดปกติที่การส่งแสง"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Display panel (จอแสดงผล)",
          "checkTitle": "3.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "4.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Camera (Lens) (เลนส์กล้อง)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "7",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Press fit jig (จิ๊ก ใส่งาน)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่นและสิ่งสกปรกอยู่ภายใน"
        },
        {
          "no": "8",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Fiber tray (ถาดใส่ชิ้นงาน)",
          "checkTitle": "8.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Stage stopper (ตัวหยุดแท่นสไลด์)",
          "checkTitle": "9.1 ต้องไม่มีการโยกคลอนขณะที่ stage เคลื่อนไหว"
        },
        {
          "no": "10",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "10.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "11",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Limit Switch (ลิมิต สวิตซ์)",
          "checkTitle": "11.1 ต้องไม่มีการชำรุดเสียหายและ Abnormal operation"
        },
        {
          "no": "12",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Buzzer (บัซเซอร์)",
          "checkTitle": "12.1 Buzzer ต้องมีเสียงเตือนเมื่อเกิด alarm"
        },
        {
          "no": "13",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Camera (Lens)  (เลนส์กล้อง)",
          "checkTitle": "13.1 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "14",
          "section": "<< จุดทำความสะอาด >>",
          "period": "12 เดือน",
          "item": "LM guide (รางสไลด์)",
          "checkTitle": "14.1 หลังเช็ดทำความสะอาดแล้ว จะต้องเคลือบตรงส่วนที่เป็น rolling surface ไว้บางๆ"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "LNF",
    "technicianSheet": null,
    "issueDate": "43060",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-005 _ LNF-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LNF  - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "LN - PMF PRESS FIT MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-006",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 16,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "V block (วี บล็อก)",
          "checkTitle": "1.1 ต้องไม่มีรอยขีดข่วน, การสึก"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Pin (พิน)",
          "checkTitle": "2.1 ต้องไม่มีการสึก"
        },
        {
          "no": "3",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Boby เครื่องจักรและบริเวณโดยรอบ",
          "checkTitle": "3.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "4",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "4.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "V block (วี บล็อก)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Objective lens (เลนส์)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Objective lens (เลนส์)",
          "checkTitle": "6.2 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "7",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Rubber roll (ล้อยาง)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Rubber roll (ล้อยาง)",
          "checkTitle": "8.1 ต้องไม่แข็ง"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Camera (กล้อง)",
          "checkTitle": "9.1 ต้องไม่เอียง （ดูจาก V block เป็นเกณฑ์）"
        },
        {
          "no": "10",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "10.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "11",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Projector (เครื่องฉายแสง)",
          "checkTitle": "11.1 ต้องไม่มีความผิดปกติที่การส่งแสง"
        },
        {
          "no": "12",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch, Indicator light (สวิตซ์,หลอดไฟ)",
          "checkTitle": "12.1 หลอดไฟต้องไม่ขาด, ไม่ชำรุดเสียหายหรือ Abnormal operation"
        },
        {
          "no": "13",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Display panel (หน้าจอแสดงผล)",
          "checkTitle": "13.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Display panel (หน้าจอแสดงผล)",
          "checkTitle": "13.2 Protection film จะต้องไม่หลุดลอก"
        },
        {
          "no": "14",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Holding Jig",
          "checkTitle": "14.1 ต้องไม่มีคราบติดที่รูเกลียว"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "FAM",
    "technicianSheet": null,
    "issueDate": "43773",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-006_ FAM-XXX .xlsx",
    "factory": "",
    "machineCodeRaw": "FAM - 001",
    "hasTechnicianSheet": false,
    "machineName": "2 CORE FERRULE ANGLE MEASURING DEVICE"
  },
  {
    "wiNo": "WI-TPM-OPT-007",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 9,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Adapter (อะแดปเตอร์)",
          "checkTitle": "1.1 ต้องไม่โยกคลอนและไม่มีการเสียรูปทรง"
        },
        {
          "no": "2",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "2.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "3",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "3.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "4",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Camera (Lens) (เลนส์กล้อง)",
          "checkTitle": "4.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Camera (กล้อง)",
          "checkTitle": "5.1 ต้องไม่เอียง (ดู Adapter เป็นเกณฑ์)"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "6.1 ต้องไม่มีการแสดงผลผิดปกติ"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Projector (เครื่องฉายไฟ)",
          "checkTitle": "7.1 ต้องไม่มีความผิดปกติที่การส่งแสง"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Buzzer (บัซเซอร์)",
          "checkTitle": "8.1 Buzzer ต้องมีเสียงเตือนเมื่อเกิด alarm"
        },
        {
          "no": "9",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Switch, Indicator light (สวิตซ์,หลอดไฟ)",
          "checkTitle": "9.1 ต้องไม่มีหลอดขาด, การชำรุดเสียหายและ Abnormal operation"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "PAD",
    "technicianSheet": null,
    "issueDate": "43890",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-007 _ PAD -XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "PAD - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "PANDA ALIGNMENT DEVICE"
  },
  {
    "wiNo": "WI-TPM-OPT-008",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Main shaft (แกนหมุ่นหลัก)",
          "checkTitle": "1.1 ต้องไม่มีเสียงผิดปกติขณะที่หมุน"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Main shaft (แกนหมุ่นหลัก)",
          "checkTitle": "2.1 ตรวจเช็คการเปลี่ยนแปลงของ speed เนื่องมาจากมุมในการกระดกของ Arm"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Main shaft (แกนหมุ่นหลัก)",
          "checkTitle": "3.1 ตรวจเช็คการ start   ,  stop ของ arm เนื่องมาจากมุมในการกระดกของ arm"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Arm (แขนดึงท่อ)",
          "checkTitle": "4.1 ต้องไม่มีความผิดปกติที่การทำงานของ Arm"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "5.1ตัวเครื่องและบริเวณโดยรอบเครื่อง"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Swtich, Indicator light (สวิตซ์,หลอดไฟ)",
          "checkTitle": "6.1 หลอดไฟต้องไม่ขาด, ต้องไม่มีการชำรุดเสียหายและไม่มี Abnormal operation"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "ACF",
    "technicianSheet": null,
    "issueDate": "43060",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-008_ ACF-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "ACF - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "AUTOMATIC CABLE FEEDER"
  },
  {
    "wiNo": "WI-TPM-OPT-009",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 13,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Set unit (เซ็ต ยูนิต)",
          "checkTitle": "1.1 ต้องไม่มีคราบกาวเกาะติดอยู่ตรงร่อง V  ของ Glass plate"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Set unit (เซ็ต ยูนิต)",
          "checkTitle": "2.1 Spring จะต้องไม่เสื่อมสภาพ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Camera (Lens) (กล้อง)",
          "checkTitle": "3.1 กล้องจะต้องถูกเซ็ตไว้ให้ขนานกับ stage"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "UV Irradiator (เครื่องฉาย ยูวี)",
          "checkTitle": "4.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Boby (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Camera (Lens) (เลนส์ กล้อง)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "7.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Projector (เครื่องฉายไฟ)",
          "checkTitle": "8.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "UV Irradiator (เครื่องฉาย ยูวี)",
          "checkTitle": "9.2 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "10",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch, Indicator light (สวิตซ์,หลอดไฟ)",
          "checkTitle": "10.1 หลอดไฟต้องไม่ขาด, ไม่ชำรุดเสียหาย, ไม่มี Abnormal operation"
        },
        {
          "no": "11",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Display panel (จอแสดงผล)",
          "checkTitle": "11.1 Protection film จะต้องไม่หลุดลอก"
        },
        {
          "no": "12",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Camera (Lens) (เลนส์ กล้อง)",
          "checkTitle": "12.1 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "13",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Spot lens สำหรับฉายแสง UV (เลนส์ ฉายแสงยูวี)",
          "checkTitle": "13.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        }
      ]
    },
    "issueRevision": "2",
    "docNo": "QR-PT-046-D",
    "prefix": "GJM",
    "technicianSheet": {
      "wiNo": "WI-TPM-FR-009",
      "itemCount": 2,
      "issueRevision": "2",
      "issueDate": "45985",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Display panel(จอแสดงผล)",
          "checkTitle": "1.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Fan(พัดลม)",
          "checkTitle": "2.1 ต้องไม่มีเสียงหรือการสั่นที่ผิดปกติ"
        }
      ]
    },
    "issueDate": "45985",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-009 _ GJM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "GJM - _ _ _",
    "hasTechnicianSheet": true,
    "machineName": "GULING JIG  (For 2 cores fiber)"
  },
  {
    "wiNo": "WI-TPM-OPT-011",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "V block (วี บล๊อก)",
          "checkTitle": "1.1 ต้องไม่มีรอยขีดข่วน, การสึก"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Laser irradiator (เครื่องฉายแสงเลเซอร์)",
          "checkTitle": "2.1 ต้องไม่มีการปล่อยแสงที่ผิดปกติ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Laser power supply (แหล่งจ่ายไฟ)",
          "checkTitle": "3.1 ต้องไม่มีการชำรุดเสียหายและ Abnormal operation"
        },
        {
          "no": "4",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "4.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "V block (วี บล๊อก)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่นและคราบสกปรกของน้ำมัน"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "PAM",
    "technicianSheet": null,
    "issueDate": "43890",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-011_ PAM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "PAM   - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "POLISHING ANGLE MEASURING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-012",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 8,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Set unit (เซ็ต ยูนิต)",
          "checkTitle": "1.1ต้องไม่มีรอยขีดข่วน, การสึก"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Stage (แท่นรอง)",
          "checkTitle": "2.1 ต้องไม่มีการโยกคลอน"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "3.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Projector ( เครื่องฉายไฟ)",
          "checkTitle": "4.1 ต้องไม่มีการส่งแสงที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Objective Lens (เลนส์ ตรวจวัด)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Objective Lens (เลนส์ ตรวจวัด)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่นและคราบสกปรกของน้ำมัน"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "6 เดือน",
          "item": "LM Guide (รางสไลด์)",
          "checkTitle": "8.1 เคลือบบางๆหลังเช็ดทำความสะอาด"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "SPS",
    "technicianSheet": null,
    "issueDate": "43890",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-012 _ SPS-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "SPS  - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "SLOP POLISHING SURFACE INSPECTION DEVICE"
  },
  {
    "wiNo": "WI-TPM-OPT-013",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 9,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Setting unit (จุดตั้งค่า)",
          "checkTitle": "1.1 ต้องไม่มีการสึกและรอยขีดข่วน"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Plunger (พินสำหรับล็อกชิ้นงาน)",
          "checkTitle": "2.1 ball unit จะต้องไม่สึกและ spring จะต้องไม่เสื่อมสภาพ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Stage (แท่นสไลด์)",
          "checkTitle": "3.1 ต้องไม่มีการโยกคลอน"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor (จอแสดงผล)",
          "checkTitle": "4.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Projector (เครื่องฉายไฟ)",
          "checkTitle": "5.1 ต้องไม่มีการส่งแสงที่ผิดปกติ"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "7",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Objective lens (เลนส์กล้อง)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "8",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Objective lens (เลนส์กล้อง)",
          "checkTitle": "8.1 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "9",
          "section": "<< จุดทำความสะอาด >>",
          "period": "6 เดือน",
          "item": "LM guide (รางสไลด์)",
          "checkTitle": "9.1 เคลือบบางๆ หลังเช็ดทำความสะอาด"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "PSI",
    "technicianSheet": null,
    "issueDate": "43890",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-013 _ PSI-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "PSI  - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "POLISHING SURFACE INSPECTION DEVICE FOR 2 CORES CAPILLARY"
  },
  {
    "wiNo": "WI-TPM-OPT-014",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 15,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Head unit (หัดตัดชิ้นงาน)",
          "checkTitle": "1.1 ต้องไม่มีความผิดปกติที่ประสิทธิภาพการตัด"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Controller unit (ตู้ควบคุม)",
          "checkTitle": "2.1 ต้องไม่มีการแสดงผลการ Alarm"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Safety door limit switch (เซ็นเซอร์ เช็คประตู)",
          "checkTitle": "3.1 ต้องไม่มีการตัดสินผิดพลาดขณะที่เปิด/ปิด Safety door"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Jig setting stand (จิ๊ก ตั้งค่าแท่น)",
          "checkTitle": "4.1 ต้องไม่มีรอยยุบ, รอยขีดข่วน"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Plunger (ไกด์ล็อก)",
          "checkTitle": "5.1 ต้องไม่มีการสึกของ ball, spring จะต้องไม่เสื่อมสภาพ"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Toggle clamp (ที่หนีบชิ้นงาน)",
          "checkTitle": "6.1 ต้องไม่มีความผิดปกติที่การ clamp"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Jig setting check sensor (เซ็นเซอร์ล๊อกจิ๊ก)",
          "checkTitle": "7.1 ต้องไม่มีการตัดสินผิดพลาดขณะที่เซ็ต jig ไม่ได้เซ็ต jig"
        },
        {
          "no": "8",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "8.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "9",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (Control box,Operation panel)(อุปกรณ์ไฟฟ้า)",
          "checkTitle": "9.1ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "10",
          "section": "<< จุดทำความสะอาด >>",
          "period": "2 สัปดาห์",
          "item": "Laser emission port(Protection glass)(กระจกป้องกัน)",
          "checkTitle": "10.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "11",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch , Indicator lamp (สวิตซ์ , หลอดไฟ)",
          "checkTitle": "11.1 หลอดไฟต้องไม่ขาด, ไม่ชำรุดเสียหายและไม่มี Abnormal operation"
        },
        {
          "no": "12",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Display panel (จอแสดงผล)",
          "checkTitle": "12.1  Protection film ต้องไม่มีการหลุดลอก"
        },
        {
          "no": "13",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "13.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "14",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Laser head unit (Each filter) (ตัวกรองฝุ่น)",
          "checkTitle": "14.1ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "15",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Laser controller unit (Filter)(ตัวกรอง)",
          "checkTitle": "15.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "LCC",
    "technicianSheet": {
      "wiNo": "WI-TPM-FR-014",
      "itemCount": 6,
      "issueRevision": "0",
      "issueDate": "43068",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Head unit fan",
          "checkTitle": "1.1 ต้องไม่มีเสียงหรือการสั่นที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Controller unit fan",
          "checkTitle": "2.1 ต้องไม่มีเสียงหรือการสั่นที่ผิดปกติ"
        },
        {
          "no": "3",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Actuator",
          "checkTitle": "3.1 ต้องไม่มีเสียงผิดปกติหรือ Abnormal operation"
        },
        {
          "no": "4",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Cooling fan",
          "checkTitle": "4.1 ต้องไม่มีเสียงหรือการสั่นที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "12 เดือน",
          "item": "Actuator (Guide)",
          "checkTitle": "1.1 หลังจากเช็ด Grease ออกจาก Guide ซ้ายและ Ball screw แล้ว ทำการหยอด Grease 1 จุด ปริมาณที่หยอดประมาณ 1.5 - 2.0 CC"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "12 เดือน",
          "item": "Actuator (Ball screw)",
          "checkTitle": "2.1 หลังจากเช็ด Grease ออกจาก Guide ซ้ายและ Ball screw แล้ว ทำการหยอด Grease 1 จุด ปริมาณที่หยอดประมาณ 1.5 - 2.0 CC"
        }
      ]
    },
    "issueDate": "43068",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-014 _ LCC-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LCC - 0 0 1",
    "hasTechnicianSheet": true,
    "machineName": "LASER CLEAVE CUTTING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-015",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 9,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "LED สำหรับ Alarm notification (Green,Red)(สัญญาณไฟเตือน)",
          "checkTitle": "1.1 จะต้องไม่มีการแสดงผล alarm"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch, Indicator light (สวิตซ์ , หลอดไฟ)",
          "checkTitle": "2.1 ต้องไม่มีหลอดไฟขาด, ชำรุดเสียหาย,  Abnormal operation"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Controller (Display unit) (หน้าจอควบคุม)",
          "checkTitle": "3.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "UV - LED",
          "checkTitle": "4.1 แสง UV จะต้องติดตามเวลาที่ตั้งไว้"
        },
        {
          "no": "5",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "UV Irradiation machine (Filter) (ตัวกรอง อากาศ)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "6",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "UV Irradiation machine(Irradiation window glass surface)(กระจกฉายยูวี)",
          "checkTitle": "6.1 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "7",
          "section": "<< จุดทำความสะอาด >>",
          "period": "วัน",
          "item": "UV Irradiation machine (Fan)(พัดลม)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Fan (พัดลม)",
          "checkTitle": "8.1 ต้องไม่มีเสียงหรือการสั่นที่ผิดปกติขณะที่หมุน"
        },
        {
          "no": "9",
          "section": "<< จุดทำความสะอาด >>",
          "period": "เดือน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "9.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "UIM",
    "technicianSheet": null,
    "issueDate": "43881",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-015 _ UIM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "UIM - 0 0 3",
    "hasTechnicianSheet": false,
    "machineName": "UV LRRADIATION MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-016",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 13,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Work clamp (ที่ยึดชิ้นงาน)",
          "checkTitle": "1.1 Spring จะต้องไม่เสื่อมสภาพ"
        },
        {
          "no": "",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Work clamp (ที่ยึดชิ้นงาน)",
          "checkTitle": "1.2 ต้องไม่มีการบิ่น, สึกหรอ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Work set stand (แท่นเซ็ตชิ้นงาน)",
          "checkTitle": "2.1 ต้องไม่มีรอยขีดข่วน หรือเสื่อมสภาพ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Adapter (อะแดปเตอร์เสียบชิ้นงาน)",
          "checkTitle": "3.1 บริเวณจุดเชื่อมต่อจะต้องไม่มีการโยกคลอน"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "4.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "5.1ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "6",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Objective lens (เลนส์กล้อง)",
          "checkTitle": "6.1ต้องไม่มีฝุ่น"
        },
        {
          "no": "7",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Work set stand (แท่นเซ็ตชิ้นงาน)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "8",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Adapter (อะแดปเตอร์เสียบชิ้นงาน)",
          "checkTitle": "8.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch และ Indicator light (สวิตซ์,หลอดไฟ)",
          "checkTitle": "9.1 หลอดไฟจะต้องไม่ขาด, ไม่ชำรุดเสียหาย,  ไม่มี Abnormal operation"
        },
        {
          "no": "10",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "10.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "11",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Projector (เครืองฉายไฟ)",
          "checkTitle": "11.1 ต้องไม่มีการส่งแสงที่ผิดปกติ"
        },
        {
          "no": "12",
          "section": "<< ทำความสะอาด >>",
          "period": "เดือน",
          "item": "Objective lens (เลนส์กล้อง)",
          "checkTitle": "12.1 ต้องไม่มีสิ่งสกปรก"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "PMC",
    "technicianSheet": {
      "wiNo": "WI-TPM-OPT-016",
      "itemCount": 3,
      "issueRevision": "1",
      "issueDate": "43881",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Actuator",
          "checkTitle": "1.1ต้องไม่มีเสียง, การสั่นที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "เดือน",
          "item": "Actuator (Linear guide) (รางสไลด์)",
          "checkTitle": "1.1 จาระบี จะต้องไม่แห้ง ไม่เสือมสภาพ"
        },
        {
          "no": "3",
          "section": "<<จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "เดือน",
          "item": "Actuator (Ball Screw) (แกนหมุ่นรางสไลด์)",
          "checkTitle": "2.1 จาระบี จะต้องไม่แห้ง ไม่เสือมสภาพ"
        }
      ]
    },
    "issueDate": "43881",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-016_PMC-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "PMC - _ _ _",
    "hasTechnicianSheet": true,
    "machineName": "Pitch measurement for 2 cores capillary"
  },
  {
    "wiNo": "WI-TPM-OPT-017",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 4,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Force gauge (เครื่องวัดแรง)",
          "checkTitle": "1.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "2.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Collet chuck (หัวจับชิ้นงาน)",
          "checkTitle": "3.1 ต้องไม่มีการสึกหรอ"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch (สวิตซ์)",
          "checkTitle": "4.1 ต้องไม่มีการชำรุดเสียหายและ Abnormal operation"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "TST",
    "technicianSheet": {
      "wiNo": "WI-TPM-OPT-017",
      "itemCount": 4,
      "issueRevision": "1",
      "issueDate": "43585",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "เดือน",
          "item": "Actuator (Ball screw) (แกนหมุน)",
          "checkTitle": "1.1 หลังเช็คทำความสะอาดแล้วให้เคลือบไว้บางๆ บริเวณ Rooling surface"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "เดือน",
          "item": "Actuator (Linear guide) (รางสไลด์)",
          "checkTitle": "2.1 หลังเช็คทำความสะอาดแล้วให้เคลือบไว้บางๆ บริเวณ Sliding groove"
        },
        {
          "no": "3",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "6 เดือน",
          "item": "Actuator (ตัวสไลด์)",
          "checkTitle": "3.1 ต้องไม่มีเสียง, การสั่นที่ผิดปกติ"
        },
        {
          "no": "4",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "6 เดือน",
          "item": "Actuator (ตัวสไลด์)",
          "checkTitle": "4.1 ต้องไม่มีการหมุนที่ผิดปกติ"
        }
      ]
    },
    "issueDate": "43585",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-017_TST-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "TST - 0 0 1",
    "hasTechnicianSheet": true,
    "machineName": "TENSILE STRENGTH TESTING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-018",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "1.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Turn table (แท่นหมุน)",
          "checkTitle": "2.1 ต้องไม่มีเสียงและการสั่นที่ผิดปกติ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Switch (สวิตซ์)",
          "checkTitle": "3.1 ต้องไม่มีการชำรุดเสียหายและ การทำงานที่ผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "เดือน",
          "item": "Fan filter (ตัวกรองพัดลม)",
          "checkTitle": "4.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "2 เดือน",
          "item": "Turn table (แท่นหมุน)",
          "checkTitle": "5.1 ต้องไม่มีการหมุนที่ผิดปกติ"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "6 เดือน",
          "item": "Pressure spring (แรงดัน สปริง)",
          "checkTitle": "6.1 ความยาวของ spring จะต้องตรงตามมาตรฐาน（14.5mm Min）"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "CSP",
    "technicianSheet": {
      "wiNo": "WI-TPM-OPT-018",
      "itemCount": 4,
      "issueRevision": "1",
      "issueDate": "43890",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Motor",
          "checkTitle": "1.1 ต้องไม่มีเสียง, การสั่นที่ผิดปกติ"
        },
        {
          "no": "",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Motor",
          "checkTitle": "1.2 ต้องไม่มีการหมุนที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Fan",
          "checkTitle": "2.1 ต้องไม่มีเสียง, การสั่นที่ผิดปกติ"
        },
        {
          "no": "3",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Display panel",
          "checkTitle": "3.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        }
      ]
    },
    "issueDate": "43890",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-018_CSP-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "CSP - _ _ _",
    "hasTechnicianSheet": true,
    "machineName": "Optical connector surface polishing machine (New type)"
  },
  {
    "wiNo": "WI-TPM-OPT-024",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Slide of cutting fiber",
          "checkTitle": "1.1 จะต้องเลือนได้และไม่ติดขัด"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Peeling",
          "checkTitle": "2.1 นำงานมาทำการปอก จำนวน 5 Pcs. เพื่อเช็ค ในส่วนของ Blade"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Blade",
          "checkTitle": "3.1 จะต้องไม่สึกหรอ, แตกหัก หรือ บิ่น"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch",
          "checkTitle": "4.1 จะต้องทำงานได้ , ไม่แตกหัก"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine body (บริเวณรอบๆเครื่องจักร)",
          "checkTitle": "5.1 จะต้องไม่มีเศษขยะหรือเศษฝุ่น"
        },
        {
          "no": "6",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Blade",
          "checkTitle": "6.1 จะต้องไม่มีเศษ Fiber ติดอยู่"
        }
      ]
    },
    "issueRevision": "3",
    "docNo": "QR-PT-046-D",
    "prefix": "JSM",
    "technicianSheet": null,
    "issueDate": "45908",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-024_JSM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "JSM - _ _ _",
    "hasTechnicianSheet": false,
    "machineName": "HOT JACKET STRIPPER MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-041",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 2,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Lens",
          "checkTitle": "System.Xml.XmlElement"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "บริเวณโดยรอบ",
          "checkTitle": "System.Xml.XmlElement"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "LMM",
    "technicianSheet": {
      "wiNo": "WI-TPM-OPT-041",
      "itemCount": 2,
      "issueRevision": "0",
      "issueDate": "43614",
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (TECHNICIAN)",
      "items": [
        {
          "no": "1",
          "section": "<<จุดตรวจเช็ค >>",
          "period": "6 เดือน",
          "item": "Laser power output",
          "checkTitle": "1.1 ค่า Laser powut output จะต้องมากกว่า 13W"
        },
        {
          "no": "2",
          "section": "<<จุดทำความสะอาด >>",
          "period": "6 เดือน",
          "item": "ฟองน้ำด้านใน",
          "checkTitle": "2.1 จะต้องไม่สกปรก"
        }
      ]
    },
    "issueDate": "43614",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-041_LMM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LMM - 0 0 1",
    "hasTechnicianSheet": true,
    "machineName": "LASER MARKER"
  },
  {
    "wiNo": "WI-TPM-OPT-042",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่ร้อน , ไม่มีเสียงดัง"
        },
        {
          "no": "2",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "บริเวณโดยรอบ",
          "checkTitle": "2.1 จะต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ชุด Slide",
          "checkTitle": "3.1  จะต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "สายพาน",
          "checkTitle": "4.1 จะต้องไม่มีรอยร้าว , จะต้องไม่สึกหรอ , จะต้องไม่ขาด"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "ชุด Slide",
          "checkTitle": "5.1 จะต้องไม่ฝืด"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "คันโยก",
          "checkTitle": "6.1 จะต้องไม่ฝืด"
        }
      ]
    },
    "issueRevision": "2",
    "docNo": "QR-PT-046-D",
    "prefix": "DRL",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-042_DRL-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "DRL - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "DRILLING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-043",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่ร้อน , ไม่มีเสียงดัง"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "สายพาน",
          "checkTitle": "2.1 จะต้องไม่มีรอยร้าว , จะต้องไม่สึกหรอ , จะต้องไม่ขาด"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "บริเวณโดยรอบ",
          "checkTitle": "3.1 จะต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ปากกาจับงาน",
          "checkTitle": "4.1 จะต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ชุด Slide",
          "checkTitle": "5.1 จะต้องไม่มีสิ่งสกปรก , จะต้องไม่ฝืด"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "ตัววัดระดับน้ำมันเครื่อง",
          "checkTitle": "6.1 น้ำมันจะต้องไม่รั่วซึม , น้ำมันอยู่ในระดับ"
        }
      ]
    },
    "issueRevision": "2",
    "docNo": "QR-PT-046-D",
    "prefix": "MLM",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-043_MLM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "MLM - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "MILLING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-044",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่ร้อน , ไม่มีเสียงดัง"
        },
        {
          "no": "2",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "บริเวณโดยรอบ",
          "checkTitle": "2.1 จะต้องไม่มีสิ่งผิดปกติ"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "fiter",
          "checkTitle": "3.1 จะต้องไม่มีสิ่งผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ท่อดูด",
          "checkTitle": "4.1 จะต้องไม่มีสิ่งผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "ฝาครอบสายพาน",
          "checkTitle": "5.1 จะต้องไม่โยก , จะต้องไม่หลวม"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "สายพาน",
          "checkTitle": "6.1 สานพานจะต้องไม่สึก , จะต้องไม่ฉีกขาด"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "GRT",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-044_GRT-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "GRT - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "GRINDING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-045",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 5,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่ร้อน , ไม่มีเสียงดัง"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "ชุด Slide",
          "checkTitle": "2.1 จะต้องไม่ฝืด"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "บริเวณโดยรอบ",
          "checkTitle": "3.1 จะต้องไม่มีสิ่งผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "ห้องเก็บน้ำมันเครื่อง",
          "checkTitle": "4.1 น้ำมันจะต้องไม่รั่วซึม , น้ำมันอยู่ในระดับ"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "เดือน",
          "item": "Fiter",
          "checkTitle": "5.1 จะต้องไม่มีสิ่งผิดปกติ"
        }
      ]
    },
    "issueRevision": "2",
    "docNo": "QR-PT-046-D",
    "prefix": "SEM",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-045_SEM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "SEM - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "SURFACE GRINDING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-046",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 10,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch ควบคุมการทำงาน",
          "checkTitle": "1.1 จะต้องไม่มีรอยแตกร้าว , ทำงานได้ปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch ปรับความเร็ว spindle",
          "checkTitle": "2.1 จะต้องไม่มีรอยแตกร้าว สามารถโยกตามตำแหน่งที่กำหนดได้"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "บริเวณโดยรอบ",
          "checkTitle": "3.1 จะต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "วัน",
          "item": "ระดับน้ำมันหล่อลื่น gear box",
          "checkTitle": "4.1 จะต้องไม่ต่ำกว่าระดับที่กำหนดไว้"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "วัน",
          "item": "ระดับน้ำมันหล่อลื่นหัว spindle",
          "checkTitle": "5.1 จะต้องไม่ต่ำกว่าระดับที่กำหนดไว้"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "วัน",
          "item": "จุดหล่อลื่นชุดจับใบมีดแนวขวางและตรง",
          "checkTitle": "6.1 หยอดน้ำมันหล่อลื่นหลังการใช้งาน"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "สายพาน",
          "checkTitle": "7.1 จะต้องไม่มีรอยแตก , ไม่มีรอยฉีกขาด"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "เฟืองหมุน",
          "checkTitle": "8.1 ฟันเฟืองจะต้องไม่แตก , หัก"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Main shaft stand",
          "checkTitle": "9.1 ขณะหมุนเสียงต้องไม่ดัง , สั่นผิดปกติ"
        },
        {
          "no": "10",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Bar slide",
          "checkTitle": "10.1 ต้องไม่เป็นสนิม , เคลื่อนที่ได้ง่าย"
        }
      ]
    },
    "issueRevision": "1",
    "docNo": "QR-PT-046-D",
    "prefix": "LCH",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-046_LCH-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LCH - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "LATHE MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-050",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 5,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Display panel",
          "checkTitle": "1.1 ต้องไม่มีความผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Base",
          "checkTitle": "2.1 ต้องไม่มีการสึกหรอหรือเสื่อมสภาพ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "3.1 ต้องไม่มีเสียงผิดปกติหรือการทำงานผิดปกติ"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body , บริเวณรอบๆ",
          "checkTitle": "4.1 ต้องไม่มีฝุ่นผง คราบเปื้อน"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "6 เดือน",
          "item": "Baering",
          "checkTitle": "5.1เช็ดทำความสะอาดแล้วทา grease บางๆ"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "SLP",
    "technicianSheet": null,
    "issueDate": "43770",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-050_SLP-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "SLP - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "SLOPE POLISHING"
  },
  {
    "wiNo": "WI-TPM-OPT-051",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 5,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่ร้อน , ไม่มีเสียงดังผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch",
          "checkTitle": "2.1 จะต้องไม่มีรอยแตกร้าวเสียหาย"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ภายนอกตัวเครื่อง",
          "checkTitle": "1.1 จะต้องไม่มีเศษจากการตัด , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "สัปดาห์",
          "item": "ห้องเก็บน้ำมันเครื่อง",
          "checkTitle": "1.1 จะต้องไม่รั่วซึม , น้ำมันต้องอยู่ในระดับที่กำหนด"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "สายพาน",
          "checkTitle": "3.1 จะต้องไม่มีรอยแตก , ไม่มีรอยฉีกขาด"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "CON",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-051_CON-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "CON - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "CONTOUR MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-052",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 6,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่ร้อน , ไม่มีเสียงดังผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "สายพาน",
          "checkTitle": "2.1 จะต้องไม่มีรอยแตก , ไม่มีรอยฉีกขาด"
        },
        {
          "no": "3",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ภายนอกตัวเครื่อง",
          "checkTitle": "3.1 จะต้องไม่มีสิ่งสกปรก , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ปากกาจับงาน",
          "checkTitle": "4.1 จะต้องไม่มีสิ่งสกปรก , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ชุด slide",
          "checkTitle": "5.1 จะต้องไม่มีสิ่งสกปรก , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "สัปดาห์",
          "item": "ตัววัดระดับน้ำมันเครื่อง",
          "checkTitle": "6.1 จะต้องไม่รั่วซึม , น้ำมันต้องอยู่ระดับที่กำหนด"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "TUM",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-052_TUM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "TUM - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "TURRET MILLING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-053",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 5,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Main motor",
          "checkTitle": "1.1 จะต้องไม่มีเสียงดังผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch ON-OFF",
          "checkTitle": "2.1 จะต้องไม่มีรอยแตก , สามารถทำงานได้ปกติ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "ชุด slide",
          "checkTitle": "3.1 ชุด slide จะต้องไม่ฝืด , สามารถปรับเคลื่อนที่ได้สะดวก"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ภายนอกตัวเครื่อง",
          "checkTitle": "4.1 จะต้องไม่มีสิ่งสกปรก , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "สายพาน",
          "checkTitle": "5.1 จะต้องไม่มีรอยแตก , ไม่มีรอยฉีกขาด"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "LSD",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-053_LSD-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LSD - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "BENCH LATHE MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-054",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 9,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Spindle motor",
          "checkTitle": "1.1 จะต้องไม่มีเสียงดังผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Switch ควบคุมการทำงาน",
          "checkTitle": "2.1 จะต้องไม่มีรอยแตก"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Limit switch ควบคุมการเคลื่อนที่",
          "checkTitle": "3.1 จะต้องไม่มีรอยแตก"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Handle ควบคุมแกน slide",
          "checkTitle": "4.1 จะต้องไม่ฝืด , สามารถปรับเคลื่อนได้สะดวก"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ภายนอกตัวเครื่อง",
          "checkTitle": "5.1 จะต้องไม่มีเศษจากการตัด , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "6",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "สัปดาห์",
          "item": "Oil pump",
          "checkTitle": "6.1 จะต้องไม่รั่วซึม , น้ำมันต้องอยู่ในระดับที่กำหนด"
        },
        {
          "no": "7",
          "section": "<< จุดตรวจเช็คน้ำมัน >>",
          "period": "สัปดาห์",
          "item": "Pipe",
          "checkTitle": "7.1 จะต้องไม่รั่วซึม"
        },
        {
          "no": "8",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "จุดต่อสายไฟ",
          "checkTitle": "8.1 จะต้องไม่หลวม , จะต้องไม่มีฝุ่น"
        },
        {
          "no": "9",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "สายพาน spindle motor",
          "checkTitle": "9.1 จะต้องไม่มีรอยแตก ,  จะต้องไม่มีรอยฉีกขาด"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "MTS",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-054_MTS-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "MTS - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "MILLING MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-055",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 5,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Motor",
          "checkTitle": "1.1 จะต้องไม่มีเสียงดังผิดปกติและจะต้องไม่ร้อน"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "สวิทช์ ON-OFF",
          "checkTitle": "2.1 จะต้องไม่มีรอยแตกหรือชำรุด"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "แขนเลื่อนมอเตอร์",
          "checkTitle": "3.1 จะต้องหมุนเข้า-ออกได้และจะต้องไม่ฝืด"
        },
        {
          "no": "4",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "ภายนอกตัวเครื่อง",
          "checkTitle": "4.1 จะต้องไม่มีเศษจากการตัด ,จะต้องไม่มีฝุ่น"
        },
        {
          "no": "5",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "สัปดาห์",
          "item": "Cover ป้องกัน",
          "checkTitle": "5.1 จะต้องไม่แตกและจะต้องไม่หลุด"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "GRM",
    "technicianSheet": null,
    "issueDate": "44727",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-055_GRM-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "GRM - 0 0 1",
    "hasTechnicianSheet": false,
    "machineName": "GRINDER MACHINE"
  },
  {
    "wiNo": "WI-TPM-OPT-056",
    "factoryCheck": "G6 AND UP",
    "operatorSheet": {
      "formTitle": "TPM OPERATION STANDARD CHECK SHEET (OPERATOR)",
      "itemCount": 13,
      "items": [
        {
          "no": "1",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Monitor (จอแสดงผล)",
          "checkTitle": "1.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "2",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Floodligh",
          "checkTitle": "2.1 ต้องไม่มีการฉายแสงที่ผิดปกติ"
        },
        {
          "no": "3",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Floodlight Power Supply",
          "checkTitle": "3.1 ต้องไม่มีการทำงานผิดปกติ , ชำรุดเสียหาย"
        },
        {
          "no": "4",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "วัน",
          "item": "Display panel (จอแสดงผล)",
          "checkTitle": "4.1 ต้องไม่มีการแสดงผลที่ผิดปกติ"
        },
        {
          "no": "5",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Machine Body (ตัวเครื่องและบริเวณโดยรอบเครื่อง)",
          "checkTitle": "5.1 ต้องไม่มีฝุ่น, สิ่งสกปรก, สนิม"
        },
        {
          "no": "6",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Electrical unit (อุปกรณ์ไฟฟ้า)",
          "checkTitle": "6.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "7",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Camera (Lens) (เลนส์กล้อง)",
          "checkTitle": "7.1 ต้องไม่มีฝุ่น"
        },
        {
          "no": "8",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Press fit jig (จิ๊ก ใส่งาน)",
          "checkTitle": "8.1 ต้องไม่มีฝุ่นและสิ่งสกปรกอยู่ภายรูในและภายนอก"
        },
        {
          "no": "9",
          "section": "<< ทำความสะอาด >>",
          "period": "วัน",
          "item": "Fiber tray (ถาดใส่ชิ้นงาน)",
          "checkTitle": "9.1 ต้องไม่มีฝุ่น, สิ่งสกปรก"
        },
        {
          "no": "10",
          "section": "<< ทำความสะอาด >>",
          "period": "สัปดาห์",
          "item": "Camera (Lens) (เลนส์กล้อง)",
          "checkTitle": "10.1 ต้องไม่มีสิ่งสกปรก"
        },
        {
          "no": "11",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Stage stopper (ตัวหยุดแท่นสไลด์)",
          "checkTitle": "11.1 ต้องไม่มีการโยกคลอนขณะที่ stage เคลื่อนไหว"
        },
        {
          "no": "12",
          "section": "<< จุดตรวจเช็ค >>",
          "period": "เดือน",
          "item": "Each Switch, Display Lamp",
          "checkTitle": "12.1 ต้องไม่มีการทำงานผิดปกติ , ชำรุดเสียหาย"
        },
        {
          "no": "13",
          "section": "<< จุดตรวจเช็คน้ำมันหล่อลื่น >>",
          "period": "12เดือน",
          "item": "LM guide (รางสไลด์)",
          "checkTitle": "13.1 หลังเช็ดทำความสะอาดแล้ว จะต้องเคลือบตรงส่วนที่เป็น rolling surface ไว้บางๆ"
        }
      ]
    },
    "issueRevision": "0",
    "docNo": "QR-PT-046-D",
    "prefix": "LNP",
    "technicianSheet": null,
    "issueDate": "45777",
    "usingArea": "OPTICAL",
    "fileName": "WI-TPM-OPT-056_ LNP-XXX.xlsx",
    "factory": "",
    "machineCodeRaw": "LNP - _ _ _",
    "hasTechnicianSheet": false,
    "machineName": "LN - PMF PRESS FIT MACHINE VER4"
  }
];
