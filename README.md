# Anusamosys

ระบบลงทะเบียนเช็คชื่อและให้คะแนนผู้สมัคร (รหัส `SMO-0XX`) — Next.js 16 + Supabase, deploy บน Cloudflare Workers ผ่าน OpenNext.

**Live:** https://anusamosys.samosci.workers.dev

## สิ่งที่มีให้

- **`/`** — หน้าแรกสาธารณะ ลิงก์ไป Leaderboard และเข้าสู่ระบบเจ้าหน้าที่
- **`/leaderboard`** — สาธารณะ อันดับคะแนนสูงสุด 5 อันดับ แบบเรียลไทม์ผ่าน Supabase Realtime สไตล์ greenscreen พร้อมอนิเมชันเลื่อนอันดับและตัวเลข
- **`/staff`** — ด่านรหัสผ่าน (กรอกเฉพาะรหัส ไม่ต้องใส่ชื่อ) หลังล็อกอินจะเจอเมนูเจ้าหน้าที่
- **`/staff/checkin`** — (ต้องล็อกอิน) ค้นหา/แตะชื่อผู้สมัครเพื่อบันทึกเวลาลงทะเบียน แสดงชื่อเล่น+รหัสนักศึกษาใต้รหัส SMO พร้อมปุ่มลบการเช็คอิน
- **`/staff/score`** — (ต้องล็อกอิน) หน้าให้คะแนน/หักคะแนนสไตล์โอนเงิน (กด +10/+20/+30 หรือกรอกเอง พร้อมชื่อผู้ให้คะแนนและเหตุผล) ค้นหาสลับคนถัดไปได้ทันทีไม่ต้องกดย้อนกลับ

## Setup

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. สร้างตารางใน Supabase

เปิด Supabase Dashboard → SQL Editor → วางเนื้อหาทั้งหมดจาก [`supabase/schema.sql`](./supabase/schema.sql) แล้วรัน จากนั้นรัน migration ใน [`supabase/migrations/`](./supabase/migrations) ตามลำดับ (ปัจจุบันมี `0001_staff_name_nullable.sql`)

ไฟล์ schema จะสร้าง:
- ตาราง `participants`, `score_entries`
- View `participants_public`, `participant_totals` (ซ่อน `student_id` จาก client)
- RLS policies (client อ่านได้แค่ข้อมูลที่ไม่ sensitive, เขียนได้เฉพาะผ่าน server ด้วย service role key)
- เปิด Realtime บนตาราง `score_entries` (สำหรับหน้า leaderboard)

### 3. ตั้งค่า environment variables

**`.env.local`** (ใช้โดย `npm run seed` เท่านั้น — คัดลอกจาก `.env.local.example`):

```bash
cp .env.local.example .env.local
```

กรอก `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (มีให้แล้ว) และ `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → **service_role** — เป็นคีย์ลับ ห้ามใส่ `NEXT_PUBLIC_` prefix และห้าม commit)

**`.dev.vars`** (ใช้โดยแอป Next.js เอง ทั้งตอน `next dev` และ `wrangler dev` — คัดลอกจาก `.dev.vars.example`):

```bash
cp .dev.vars.example .dev.vars
```

กรอกค่าเดียวกัน บวกกับ `STAFF_ACCESS_CODE_HASH` และ `SESSION_SECRET` ซึ่งสร้างได้ด้วย:

```bash
npx tsx scripts/generate-secrets.ts "รหัสผ่านเจ้าหน้าที่ที่ต้องการ"
```

คำสั่งนี้จะ hash รหัสผ่านด้วย PBKDF2 (ไม่เก็บรหัสจริงไว้ที่ไหนเลย) และสุ่ม session secret ให้ — คัดลอกทั้งสองบรรทัดไปวางใน `.dev.vars`

> **หมายเหตุ**: Cloudflare Workers' WebCrypto จำกัด PBKDF2 ไว้ไม่เกิน 100,000 iterations (สูงกว่านี้จะ throw `NotSupportedError` ตอนรัน จริงบน Workers แม้จะรันผ่านตอน `next dev` บน Node ก็ตาม) — ค่านี้ hardcode ไว้ใน `src/lib/auth/crypto.ts` แล้ว ไม่ต้องแก้อะไรเพิ่ม แค่รู้ไว้เผื่อจะไปปรับ

### 4. Import รายชื่อผู้สมัคร

```bash
npm run seed
```

จะ import ผู้สมัครทั้ง 96 คนจาก [`scripts/seed-data.ts`](./scripts/seed-data.ts) (ที่มา: ตารางสัมภาษณ์ในชีทต้นฉบับ) พร้อมสร้างรหัส `SMO-001`…`SMO-096` จากลำดับในชีท รันซ้ำได้ปลอดภัย (upsert ตาม `sequence`)

### 5. รันเว็บ

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Deploy ขึ้น Cloudflare

โปรเจกต์นี้ตั้งค่า [OpenNext สำหรับ Cloudflare](https://opennext.js.org/cloudflare) ไว้แล้ว (`open-next.config.ts`, `wrangler.jsonc`)

1. ล็อกอิน wrangler (ครั้งแรกเท่านั้น):

   ```bash
   npx wrangler login
   ```

2. ตั้งค่า secrets บน Cloudflare (ค่าเดียวกับใน `.dev.vars` แต่ set สำหรับ production):

   ```bash
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
   npx wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put STAFF_ACCESS_CODE_HASH
   npx wrangler secret put SESSION_SECRET
   ```

3. Build และ deploy:

   ```bash
   npm run cf:deploy
   ```

   หรือแยกขั้นตอน: `npm run cf:build` แล้วดูตัวอย่างในเครื่องด้วย `npm run cf:preview` ก่อน deploy จริง

> **สำคัญ — ถ้า deploy บน Windows**: `npm run build` (และ `cf:build`/`cf:deploy` ที่เรียกมันต่อ) ใช้ `next build --webpack` โดยตั้งใจ ไม่ใช่ Turbopack ค่า default ของ Next 16 — เพราะ OpenNext + Turbopack บน Windows มีบั๊กเรื่อง path separator ที่ทำให้ chunk โหลดไม่เจอตอนรันจริงบน Workers (`ChunkLoadError` / `components.ComponentMod.handler is not a function`) ปัญหานี้เจอจริงและแก้ด้วยการสลับไป webpack แล้ว ห้ามเอา `--webpack` ออกถ้ายัง build บน Windows อยู่ (บน WSL/Linux/Mac น่าจะใช้ Turbopack ได้ปกติ แต่ยังไม่ได้ทดสอบ)

## สถาปัตยกรรม

- **สองชั้นของ Supabase client**: `src/lib/supabase/server.ts` ใช้ service-role key (bypass RLS) สำหรับทุกการเขียนและการอ่านฝั่ง server เท่านั้น ส่วน `src/lib/supabase/browser.ts` ใช้ publishable/anon key ฝั่ง client เฉพาะหน้า leaderboard สำหรับ Realtime subscription
- **การเขียนทั้งหมด** (เช็คอิน, ให้คะแนน) ผ่าน Server Actions เท่านั้น ไม่มี client เขียนตรงเข้า Supabase — ปิดช่องที่ใครก็ตามที่มี anon key จะข้ามด่านรหัสผ่านเจ้าหน้าที่ไปยิง insert ตรงได้
- **รหัสผ่านเจ้าหน้าที่**: hash ด้วย PBKDF2 (Web Crypto, ไม่มี native binding จึงรันได้ทั้งบน Node และ Cloudflare Workers, iteration count ถูกจำกัดที่ 100,000 ตามเพดานของ Workers) เก็บเฉพาะ hash ไว้เป็น secret ไม่เคยเก็บ plaintext ล็อกอินเป็นแบบรหัสผ่านร่วม (shared code) ไม่มีชื่อผู้ใช้ราย บุคคล — attribution รายบุคคลย้ายไปอยู่ที่ฟอร์มให้คะแนนแทน (ชื่อผู้ให้คะแนนถูกจำไว้ที่เครื่องผ่าน localStorage)
- **Session เจ้าหน้าที่**: httpOnly cookie เซ็นด้วย HMAC-SHA256 ไม่ต้อง query DB ทุกครั้งเพื่อเช็ก session
- **`student_id`** ไม่เคยถูกส่งไปถึง client บนหน้า public — เฉพาะ `/staff/checkin` (หลังล็อกอินแล้ว) เท่านั้นที่ query คอลัมน์นี้เพื่อช่วยแยกแยะชื่อซ้ำ

## โครงสร้างไฟล์ที่สำคัญ

```
supabase/schema.sql          ตาราง, views, RLS, Realtime
supabase/migrations/         migration ที่ต้องรันเพิ่มบน DB ที่มีอยู่แล้ว
scripts/seed-data.ts         ข้อมูลผู้สมัคร 96 คนจากชีทต้นฉบับ
scripts/seed.ts              สคริปต์ import เข้า Supabase
scripts/generate-secrets.ts  สร้าง STAFF_ACCESS_CODE_HASH + SESSION_SECRET
src/lib/auth/                hashing, session cookie signing (Web Crypto)
src/lib/supabase/            server (service role) / browser (publishable) clients
src/app/staff/               ด่านรหัสผ่าน + เมนู + เช็คชื่อ (staff/checkin) + ให้คะแนน (staff/score)
src/app/leaderboard/         อันดับคะแนนแบบเรียลไทม์
```
