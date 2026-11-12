# CMMS

ระบบบริหารงานซ่อมบำรุง หน้าตาแบบแผ่นงานวิศวกรรม 2D เว็บ HTML5 ล้วน ไม่ต้อง build

เปิดครั้งแรกจะใช้ข้อมูลตัวอย่าง (ไลน์ SMT 2 ไลน์) ที่เก็บในเบราว์เซอร์เครื่องนั้น จนกว่าจะเชื่อม Firebase

## หน้าในระบบ

| แผ่นงาน | หน้าที่ |
| --- | --- |
| SH-01 ภาพรวม | เครื่องที่หยุดอยู่, Availability, MTBF, MTTR, แผนภูมิสถานะ 7 วัน, งานค้าง, PM ครบกำหนด, อะไหล่ถึงจุดสั่งซื้อ |
| SH-02 ใบสั่งงาน | แจ้งซ่อม → อนุมัติ → ซ่อม/รออะไหล่ → ปิดงาน ปิดงานต้องมีรหัสสาเหตุและการแก้ไขที่ต้นเหตุ ทุกการเปลี่ยนสถานะลงบันทึก REV |
| SH-03 เครื่องจักร | ทะเบียนเครื่อง ระดับ A/B/C เวลาหยุด 7 วัน แผน PM และประวัติงานของแต่ละเครื่อง |
| SH-04 แผน PM | แยกเลยกำหนด / ภายใน 7 วัน / ถัดไป บันทึกว่าทำแล้วจะเลื่อนรอบถัดไปและสร้างใบงาน PM ให้ |
| SH-05 อะไหล่ | คงเหลือเทียบจุดสั่งซื้อ เบิก / รับเข้า |
| SH-06 เชื่อมต่อเซิร์ฟเวอร์ | วาง firebaseConfig และใส่ข้อมูลตัวอย่างลง Firestore |

## เว็บออนไลน์ (GitHub Pages)

ทุกครั้งที่ push ขึ้น branch `main` GitHub Pages จะอัปเดตเว็บให้เอง ถ้ายังไม่ได้เปิด ให้ไปที่ Settings › Pages แล้วเลือก Source = Deploy from a branch, Branch = `main` / `(root)`

ที่อยู่เว็บ: `https://jittrakan-k.github.io/cmms/`

## เปิดในเครื่อง

ES modules ไม่ทำงานจาก `file://` ต้องเปิดผ่านเว็บเซิร์ฟเวอร์ บน Windows ดับเบิลคลิก `start_server.bat` (ต้องมี Python) หรือรัน `python serve.py`

## เชื่อม Firebase

1. สร้างโปรเจกต์ที่ console.firebase.google.com แล้วเพิ่มแอปแบบ Web คัดลอกค่า `firebaseConfig`
2. Build › Firestore Database › สร้างฐานข้อมูล เลือก location ใกล้โรงงาน เช่น `asia-southeast1` (เปลี่ยนภายหลังไม่ได้)
3. Build › Authentication › Sign-in method › เปิด Email/Password และปิดการสมัครเองใน Settings › User actions
4. Authentication › Settings › Authorized domains › เพิ่ม `jittrakan-k.github.io` ไม่อย่างนั้นล็อกอินจากเว็บบน GitHub Pages ไม่ได้
5. Deploy กฎความปลอดภัย

   ```
   npm i -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only firestore:rules
   ```

6. Authentication › Users › Add user สร้างบัญชีหัวหน้า คัดลอก User UID
7. Firestore › สร้างคอลเลกชัน `users` ใช้ Document ID เป็น UID นั้น ใส่ฟิลด์ `role` = `admin` และ `name` = ชื่อที่จะแสดง
8. เปิดเว็บ แผ่น SH-06 วาง `firebaseConfig` แล้วเข้าสู่ระบบ ระบบจะเสนอปุ่มใส่ข้อมูลตัวอย่างเมื่อฐานข้อมูลยังว่าง

ถ้าไม่อยากวางค่าทีละเครื่อง ใส่ค่าใน `js/firebase-config.js` แล้ว push ทุกเครื่องจะเชื่อมโปรเจกต์เดียวกันเอง ค่าชุดนี้ไม่ใช่รหัสลับ สิ่งที่กันข้อมูลคือ `firestore.rules`

## สิทธิ์ผู้ใช้

| role | ทำอะไรได้ |
| --- | --- |
| `admin` | อนุมัติใบงาน และจัดการเครื่อง แผน PM อะไหล่ทั้งหมด |
| `tech` | รับงานที่อนุมัติแล้ว ซ่อม ปิดงาน ทำ PM เบิกและรับอะไหล่ |
| `operator` | แจ้งซ่อมและดูข้อมูล |

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html`, `style.css` | หน้าเว็บ |
| `js/app.js` | หน้าจอและการกระทำทั้งหมด |
| `js/backend.js` | ชั้นเชื่อมข้อมูล มีโหมดตัวอย่างกับ Firebase |
| `js/firebase-config.js` | ค่าการเชื่อมต่อ |
| `firestore.rules` | กฎความปลอดภัยของฐานข้อมูล |
| `serve.py`, `start_server.bat` | เปิดเว็บในเครื่องและวง LAN |

## ข้อจำกัด

- แจ้งซ่อม ทำ PM และเบิกอะไหล่ใช้ transaction จึงต้องออนไลน์ ส่วนการดูข้อมูลล่าสุดใช้แคชในเครื่องได้เมื่อสัญญาณหลุด
- หน้าใบสั่งงานโหลดล่าสุด 300 ใบเพื่อคุมโควตาการอ่าน
- `firestore.rules` ยังไม่ได้ทดสอบกับเซิร์ฟเวอร์จริง ให้ทดสอบใน Rules Playground หรือ `firebase emulators:start` ก่อนใช้งานจริง
