# AGENTS.md — musicaso

> คู่มือสำหรับ AI coding agent (Claude Code, Codex, Cursor ฯลฯ) ที่ทำงานใน repo นี้
> อ่านไฟล์นี้ทั้งหมดก่อนเริ่มงานทุกครั้ง และอัปเดตส่วน **Roadmap** เมื่อจบแต่ละ Phase

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## 1. Project Overview

**musicaso** คือเว็บ Album Review แบบ frontend-only

- ผู้ใช้ค้นหาอัลบั้ม → ให้คะแนนทีละเพลง (0–10, ทีละ 0.5) → ระบบคำนวณคะแนนเฉลี่ยของอัลบั้ม
- **ไม่มี Database / ไม่มีระบบ login** — state ของรีวิวทั้งหมดถูก encode อยู่ใน URL
- แชร์ได้ 3 แบบ
  1. **Share Link** — ลิงก์ที่มีรีวิวฝังอยู่ คนเปิดเห็นรีวิว และกด "รีวิวต่อ / รีวิวของฉันเอง" ได้
  2. **Export Image** — การ์ด PNG (Square 1:1 และ Story 9:16) สวยพร้อมโพสต์
  3. **Export Short Video** (Phase หลัง) — วิดีโอ 9:16 สั้น ๆ มี animation ทำด้วย HyperFrames
- เน้นงาน UI/UX และความสวยงามเป็นหลัก

### Non-goals (ห้ามทำ เว้นแต่ผู้ใช้สั่ง)
- ห้ามเพิ่ม database, ORM, auth, user account, server-side storage ใด ๆ (รวมถึง KV/Redis/Blob)
- ห้ามใช้ Spotify Web API (ดูเหตุผลในหัวข้อ 4)
- ห้ามเล่นไฟล์เพลงเต็ม — ใช้ได้แค่ preview 30 วินาทีที่ provider ให้มา

---

## 2. Tech Stack

| ส่วน | เลือกใช้ | หมายเหตุ |
|---|---|---|
| Framework | **Next.js 16 (App Router)** + TypeScript `strict` | Route Handlers ใช้เป็น proxy ไปยัง music API |
| Package manager | **pnpm** | |
| Styling | **Tailwind CSS v4** | design tokens ใน `app/globals.css` (`@theme`) |
| UI animation | **motion** (`motion/react`) | micro-interaction, page transition |
| Validation | **zod** | validate response จาก API ภายนอก + share payload |
| URL compression | **lz-string** (`compressToEncodedURIComponent`) | |
| Image export | **`next/og` (`ImageResponse`)** | ใช้ทั้ง OG image และปุ่มดาวน์โหลด PNG |
| Client state | `useReducer` + Context (เพิ่ม zustand ได้ถ้าจำเป็นจริง) | draft เก็บ `localStorage` |
| Video (Phase 6) | **HyperFrames** (`heygen-com/hyperframes`) | render ด้วย CLI บนเครื่อง ไม่ใช่บน Vercel |
| Test | **Vitest** | unit test สำหรับ codec, scoring, provider mapper |
| Lint/Format | ESLint (flat config) + Prettier | |
| Deploy | Vercel | |

> ⚠️ Next.js 16 มี breaking changes จากเวอร์ชันที่ agent อาจคุ้นเคย (เช่น `params`/`searchParams` เป็น `Promise`, `middleware.ts` → `proxy.ts`, caching model ใหม่)
> **ก่อนเขียนโค้ดที่เกี่ยวกับ routing / caching / metadata ให้เช็ก docs ของเวอร์ชันที่ติดตั้งจริงเสมอ** (ดู `node_modules/next/dist/docs/` ถ้ามี หรือ nextjs.org/docs) อย่าเดาจากความจำ

---

## 3. Commands

```bash
pnpm install
pnpm dev          # dev server
pnpm build        # production build — ต้องผ่านก่อนถือว่างานเสร็จ
pnpm lint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
```

ก่อนบอกว่างานเสร็จทุกครั้ง: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` ต้องผ่านทั้งหมด

---

## 4. Music Data Sources

ทุก provider ต้องถูกเรียกผ่าน **Route Handler ของเราเอง** (`app/api/...`) ไม่เรียกตรงจาก browser
(เหตุผล: Deezer ไม่ส่ง CORS header, ซ่อน rate limit, cache ได้, และ normalize data ที่จุดเดียว)

### 4.1 Deezer API — **Primary** ✅
- Base: `https://api.deezer.com` — **ไม่ต้องใช้ API key** สำหรับ public catalog
- Rate limit ~**50 requests / 5 วินาที** ต่อ IP
- Endpoints ที่ใช้
  - `GET /search/album?q={query}&limit=20` — ค้นหาอัลบั้ม
  - `GET /album/{id}` — รายละเอียดอัลบั้ม + `tracks.data[]` (ถ้า track > 25 ให้ตาม `tracks.next` หรือเรียก `/album/{id}/tracks?limit=100`)
- ปกอัลบั้ม: `cover_xl` (1000×1000) สำหรับ export, `cover_medium` สำหรับ list
- `track.preview` = MP3 30 วินาที (บางเพลงอาจว่าง)
- Error: Deezer อาจตอบ HTTP 200 แต่ body มี `{ "error": {...} }` → ต้องเช็กเสมอ

### 4.2 iTunes Search API — **Fallback** ✅
- Search: `https://itunes.apple.com/search?term={q}&entity=album&media=music&limit=20`
- Tracks: `https://itunes.apple.com/lookup?id={collectionId}&entity=song` (result แรกคือ album, ที่เหลือคือเพลง กรองด้วย `wrapperType === "track"`)
- ไม่ต้องใช้ key แต่ limit ต่ำ (~**20 req/นาที**) → cache ให้หนัก
- ปก: แทนที่ `100x100bb` ใน `artworkUrl100` เป็น `1000x1000bb`
- รองรับ `country=th` สำหรับ catalog ไทย (ให้ลอง `th` ก่อนแล้ว fallback `us`)
- อัลบั้มที่มีหลายแผ่น: เรียงด้วย `discNumber` แล้ว `trackNumber`

### 4.3 MusicBrainz + Cover Art Archive — Optional (Phase หลัง)
- ข้อมูลเปิด, ไม่ต้องใช้ key แต่ **ต้องส่ง `User-Agent: musicaso/0.1 ( contact )`** และจำกัด **1 req/วินาที**
- ใช้เมื่ออยากได้อัลบั้มที่ Deezer/iTunes ไม่มี (indie, release เก่า)

### 4.4 ❌ ไม่ใช้ Spotify Web API
ตั้งแต่ ก.พ. 2026 Spotify บังคับให้เจ้าของแอป Development Mode ต้องมี Premium, จำกัดผู้ใช้, ถอด endpoint/field หลายตัว และกำลังเลิกรองรับ Client Credentials สำหรับ metadata — ไม่เหมาะกับโปรเจกต์ไม่มี backend แบบนี้

### 4.5 Provider Adapter Pattern
ทุก provider ต้อง implement interface เดียวกัน และ map ไปเป็น type กลาง:

```ts
// lib/music/types.ts
export type SourceId = "dz" | "it" | "mb";

export interface Track {
  id: string;
  position: number;      // 1-based, เรียงตามแผ่น+ลำดับ
  disc: number;
  title: string;
  durationSec: number;
  previewUrl?: string;
  explicit?: boolean;
}

export interface Album {
  source: SourceId;
  id: string;
  title: string;
  artist: string;
  year?: number;
  coverUrl: string;      // ขนาดใหญ่สุดที่หาได้
  coverThumbUrl: string;
  genre?: string;
  tracks: Track[];
  externalUrl?: string;  // ลิงก์ไปหน้า Deezer / Apple Music (ใช้ใน attribution)
}

export interface AlbumSummary { source: SourceId; id: string; title: string; artist: string; year?: number; coverThumbUrl: string; trackCount?: number; }

export interface MusicProvider {
  id: SourceId;
  searchAlbums(query: string): Promise<AlbumSummary[]>;
  getAlbum(id: string): Promise<Album>;
}
```

- Response จาก API ภายนอก **ต้อง parse ด้วย zod** ก่อน map เสมอ
- Cache: ใช้ `fetch(url, { next: { revalidate: 86400 } })` สำหรับ album detail, 3600 สำหรับ search (หรือกลไก cache ของ Next 16 — เช็ก docs)
- แสดง attribution เล็ก ๆ ("Data from Deezer" / "Apple Music") ในหน้ารีวิวและบนการ์ด

---

## 5. Share Link — URL as the Database

### 5.1 Payload Schema (v1)

```ts
// lib/share/schema.ts
export const ReviewPayloadV1 = z.object({
  v: z.literal(1),
  s: z.enum(["dz", "it", "mb"]),   // source
  a: z.string(),                   // album id
  k: z.number().int(),             // จำนวนเพลงตอนรีวิว (ใช้ตรวจว่า tracklist เปลี่ยนไหม)
  r: z.string(),                   // ratings แบบ compact (ดูด้านล่าง)
  n: z.string().max(40).optional(),   // ชื่อผู้รีวิว
  t: z.string().max(280).optional(),  // คำวิจารณ์สั้นของทั้งอัลบั้ม
  f: z.number().int().optional(),     // index เพลงโปรด (ถ้าไม่ใส่ = คะแนนสูงสุด)
  th: z.string().optional(),          // theme id ของการ์ด
  ref: z.object({ n: z.string().max(40).optional(), r: z.string() }).optional(), // รีวิวต้นทาง (ตอน "รีวิวต่อ")
});
```

**Rating encoding (`r`)** — 1 ตัวอักษรต่อ 1 เพลง เรียงตาม `position`
- `0`–`9`, `a`–`k` = 0–20 ครึ่งแต้ม (เช่น `k` = 10.0, `f` = 7.5) — ใช้ `n.toString(36)` / `parseInt(c, 36)`
- `_` = ข้าม (interlude/skit — ไม่นำมาคิดค่าเฉลี่ย)
- `.` = ยังไม่ให้คะแนน

### 5.2 Encoding
- `JSON.stringify(payload)` → `lz-string.compressToEncodedURIComponent` → ใส่ใน path: **`/r/{payload}`**
- ใช้ **path segment ไม่ใช่ `#hash`** เพราะ server ต้องอ่านได้เพื่อทำ OG image และ metadata
- ถ้า URL ยาวเกิน **1,800 ตัวอักษร** → ตัด/ลดข้อความ `t` ก่อน แล้วเตือนผู้ใช้ใน UI
- Decode ต้อง **ไม่ throw ไปถึง user**: payload เสีย → แสดงหน้า error ที่เป็นมิตร + ปุ่มกลับหน้าแรก
- ถ้า `k` ไม่ตรงกับจำนวนเพลงปัจจุบัน → แสดง warning แต่ยังแสดงรีวิวตามลำดับเท่าที่ตรง
- โค้ดทั้งหมดอยู่ใน `lib/share/codec.ts` และ **ต้องมี unit test round-trip ครบทุก field**

### 5.3 Flow "รีวิวต่อ"
หน้า `/r/{payload}` มีปุ่ม **"Review it yourself"** → ไป `/album/{s}/{a}?from={payload}`
→ editor เปิดเปล่า แต่โชว์คะแนนของคนก่อนเป็น ghost/side-by-side → ตอนแชร์ใส่ `ref` เพื่อให้หน้า share แสดงการเปรียบเทียบ 2 คนได้ (เก็บ `ref` ได้แค่ 1 ชั้น ไม่ซ้อนต่อ)

---

## 6. Scoring Rules

`lib/score.ts` — pure functions ทั้งหมด + unit test
- คะแนนเพลง: 0–10 ทีละ 0.5
- **Album score = ค่าเฉลี่ยของเพลงที่ให้คะแนนแล้วและไม่ถูกข้าม** แสดงทศนิยม 1 ตำแหน่ง
- Option (toggle ใน UI, เก็บใน payload ภายหลังถ้าต้องการ): ถ่วงน้ำหนักตามความยาวเพลง
- ข้อมูลเสริมที่คำนวณได้: เพลงคะแนนสูงสุด/ต่ำสุด, ส่วนเบี่ยงเบน (ความ "สม่ำเสมอ" ของอัลบั้ม), จำนวนเพลงที่ ≥ 8
- Verdict label ตามช่วงคะแนน (เช่น 9+ "Masterpiece", 8+ "Great", 6.5+ "Good", 5+ "Mixed", ต่ำกว่า "Skip") — กำหนดไว้ที่เดียวใน `lib/score.ts`

---

## 7. Routes & Folder Structure

```
app/
  page.tsx                          # หน้าแรก: search + อัลบั้มตัวอย่าง
  album/[source]/[id]/page.tsx      # Review editor (server fetch album → client editor)
  r/[payload]/page.tsx              # Read-only shared review + generateMetadata
  r/[payload]/opengraph-image.tsx   # OG image 1200×630
  r/[payload]/card/route.tsx        # PNG สำหรับดาวน์โหลด ?format=square|story
  api/search/route.ts               # GET ?q=&source=
  api/album/[source]/[id]/route.ts  # GET (ใช้ฝั่ง client ถ้าจำเป็น)
  api/cover/route.ts                # proxy รูปปก — allowlist host เท่านั้น
components/
  search/  review/  share/  card/  ui/
lib/
  music/types.ts
  music/providers/deezer.ts
  music/providers/itunes.ts
  music/index.ts                    # getProvider(source)
  share/schema.ts  share/codec.ts
  score.ts
  fonts.ts                          # โหลดฟอนต์สำหรับ ImageResponse
video/                              # Phase 6 — HyperFrames composition template
  template/index.html
  scripts/render.ts
tests/
```

- `/api/cover` ต้องมี **allowlist host** (Deezer CDN, `*.mzstatic.com`, `coverartarchive.org`) — ห้ามเป็น open proxy
- `next.config.ts`: ตั้ง `images.remotePatterns` ให้ตรงกับ host เดียวกัน

---

## 8. Image Export

- ใช้ **`ImageResponse` จาก `next/og`** render การ์ดฝั่ง server → ได้ PNG ที่เหมือนกันทุกเครื่อง ไม่มีปัญหา CORS ของ canvas
- 2 format: `square` 1080×1080, `story` 1080×1920 (+ OG 1200×630)
- ข้อจำกัดของ Satori: รองรับแค่ flexbox และ CSS subset — ทุก `div` ที่มีลูกหลายตัวต้องมี `display: flex`, ไม่มี grid, ไม่มี Tailwind class (ใช้ inline style หรือ `tw` prop)
- **ฟอนต์ภาษาไทยต้องโหลดเอง** (เช่น Noto Sans Thai / IBM Plex Sans Thai / Anuphan) เป็น `ArrayBuffer` ใน `lib/fonts.ts` ไม่งั้นชื่อเพลงไทยจะเป็นกล่องสี่เหลี่ยม — ทดสอบด้วยอัลบั้มไทยจริงเสมอ
- ปุ่ม Download ฝั่ง client: `fetch(cardUrl)` → blob → `<a download>`; บนมือถือใช้ `navigator.share({ files })` ถ้ารองรับ
- ธีมการ์ด: ดึงสีหลักจากปกอัลบั้ม (dominant color) เพื่อทำ gradient — คำนวณฝั่ง server ตอน render (เช่นด้วย `sharp` stats หรือ algorithm ง่าย ๆ)

---

## 9. Video Export (Phase 6) — HyperFrames

- HyperFrames = open-source framework จาก HeyGen ที่แปลง HTML + CSS + GSAP เป็น MP4 ผ่าน headless Chrome + FFmpeg
- **render บน Vercel serverless ไม่ได้** → แผนคือ
  1. `video/template/index.html` = composition 9:16 ราว 15–30 วินาที (ปกอัลบั้ม zoom-in → เพลงไล่ขึ้นทีละแถวพร้อมคะแนน → คะแนนรวมนับขึ้น → verdict)
  2. ข้อมูลรีวิวถูก inject เข้า template จาก share payload
  3. `pnpm video <shareUrl>` (script ใน `video/scripts/render.ts`) → เรียก `npx hyperframes render` บนเครื่อง dev
  4. ในเว็บ: แสดง preview ด้วย `<hyperframes-player>` web component (ถ้าใช้ได้) ไม่ต้อง render จริง
- ก่อนเริ่ม Phase นี้: ติดตั้ง skills `npx skills add heygen-com/hyperframes` และอ่าน docs ล่าสุด — **อย่าเดา API ของ HyperFrames จากความจำ**
- Audio: ห้ามใส่ preview เพลงลงในวิดีโอที่จะเผยแพร่ (ปัญหาลิขสิทธิ์) — ใช้เสียงเงียบหรือ SFX ที่ไม่มีลิขสิทธิ์

---

## 10. Design Direction

- Dark-first, typographic, รู้สึกเหมือนนิตยสารดนตรี/ปกแผ่นเสียง — ปกอัลบั้มคือพระเอก
- สีของหน้า review ปรับตาม dominant color ของปก (CSS variable `--album-accent`)
- Rating input: slider + ปุ่มตัวเลข + keyboard (`←/→` ±0.5, `0–9` ตั้งคะแนนเร็ว, `S` ข้ามเพลง, `↑/↓` เลื่อนเพลง)
- คะแนนรวมอัปเดตแบบ live พร้อม animated number
- Mobile-first: ทุกหน้าต้องใช้ได้ดีที่ 375px
- Accessibility: ทุก control ใช้ keyboard ได้, contrast ผ่าน WCAG AA, เคารพ `prefers-reduced-motion`

---

## 11. Coding Conventions

- TypeScript `strict`, ห้าม `any` (ใช้ `unknown` + zod)
- Server Components เป็นค่า default; ใส่ `"use client"` เฉพาะ component ที่ต้องมี state/interaction
- Logic ที่ไม่ใช่ UI (codec, score, mapper) เป็น pure function ใน `lib/` และต้องมี test
- ชื่อไฟล์ kebab-case, component PascalCase
- ไม่เพิ่ม dependency ใหม่โดยไม่จำเป็น — ถ้าเพิ่มให้บอกเหตุผลใน PR/commit message
- Error จาก provider: แสดงข้อความที่เข้าใจง่าย + ปุ่มลองใหม่ / สลับ source
- ข้อความ UI: ภาษาอังกฤษเป็นหลัก (เตรียมโครงสร้างให้เพิ่มภาษาไทยได้ภายหลัง)
- Commit แบบ Conventional Commits (`feat:`, `fix:`, `chore:` …), commit ทีละเรื่องย่อย

---

## 12. Roadmap

อัปเดต checkbox เมื่อทำเสร็จ ทำทีละ Phase และให้ผู้ใช้ review ก่อนขึ้น Phase ถัดไป

### Phase 0 — Setup
- [ ] `create-next-app` (TS, App Router, Tailwind, ESLint, pnpm) ใน repo `musicaso`
- [ ] เพิ่ม scripts `typecheck`, `test`; ติดตั้ง vitest, zod, lz-string, motion
- [ ] ตั้ง design tokens + ฟอนต์ (รวมฟอนต์ไทย) + layout หลัก

### Phase 1 — Data Layer
- [ ] types กลาง + Deezer provider + iTunes provider (zod schema + mapper + tests ด้วย fixture JSON)
- [ ] `/api/search`, `/api/cover` (allowlist)
- [ ] หน้าแรก: search box (debounce 300ms) + ผลลัพธ์เป็น grid ปก

### Phase 2 — Review Editor
- [ ] `/album/[source]/[id]`: header อัลบั้ม, tracklist, rating input ต่อเพลง, ปุ่มข้ามเพลง, preview 30s
- [ ] `lib/score.ts` + live album score + verdict
- [ ] autosave draft ลง `localStorage` (key: `musicaso:draft:{source}:{id}`)

### Phase 3 — Share Link
- [ ] `lib/share/codec.ts` + tests (round-trip, payload เสีย, URL ยาวเกิน)
- [ ] `/r/[payload]` read-only view + `generateMetadata` + `opengraph-image`
- [ ] ปุ่ม Copy link / Web Share API
- [ ] Flow "Review it yourself" + เปรียบเทียบกับ `ref`

### Phase 4 — Image Export
- [ ] `/r/[payload]/card?format=square|story` ด้วย `ImageResponse` + ฟอนต์ไทย + dominant color
- [ ] ปุ่มดาวน์โหลด / แชร์ไฟล์บนมือถือ
- [ ] 2–3 ธีมการ์ด

### Phase 5 — Polish
- [ ] Animation (page transition, score count-up, track reveal), reduced-motion
- [ ] Empty/loading/error states ครบ, skeleton
- [ ] Lighthouse ≥ 90 ทุกหมวดบนมือถือ, deploy Vercel

### Phase 6 — Short Video (HyperFrames)
- [ ] composition template 9:16 + data injection
- [ ] `pnpm video <shareUrl>` render MP4 บนเครื่อง
- [ ] (optional) preview ในเว็บด้วย `<hyperframes-player>`
