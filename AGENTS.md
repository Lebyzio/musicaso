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
| Image export | **`satori` + `@resvg/resvg-wasm`** (`lib/render-image.ts`) | ใช้ทั้ง OG image และการ์ด PNG — ห้ามใช้ `next/og` เพราะภาษาไทยเพี้ยน (ดูหัวข้อ 8) |
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
- ค้นด้วยชื่อศิลปินพอดี (`isSameName` ใน `lib/music/match.ts`) → `searchArtistAlbums` ดึง `/search/artist?limit=1` + `/artist/{id}/albums?limit=100` (เรียงตาม `fans`) แสดงเป็นแถบ "Albums by …" — album search ให้แค่ 20 ผลปนศิลปินอื่น อัลบั้มดังของศิลปินอาจไม่ติด
- Endpoints ที่ใช้
  - `GET /search/album?q={query}&limit=20` — ค้นหาอัลบั้ม
  - `GET /album/{id}` — รายละเอียดอัลบั้ม + `tracks.data[]` (ถ้า track > 25 ให้ตาม `tracks.next` หรือเรียก `/album/{id}/tracks?limit=100`)
- ปกอัลบั้ม: `cover_xl` (1000×1000) สำหรับ export, `cover_big` (500) สำหรับ list (`cover_medium` 250px เบลอบนจอ 2x)
- ⚠️ track ที่ฝังมากับ `/album/{id}` หยุดที่ 25 เพลงและ **ไม่มี `disk_number`** → ดึง tracklist จาก `/album/{id}/tracks?limit=100` เสมอ (ตาม `next`)
- `track.preview` = MP3 30 วินาที (บางเพลงอาจว่าง) — ⚠️ **เป็น signed URL หมดอายุในไม่กี่นาที** ห้าม cache ไว้กับข้อมูลอัลบั้ม → `Track.previewUrl` ของ Deezer ชี้ไป `/api/preview/dz/{trackId}` ซึ่ง 302 ไป URL สดจาก `GET /track/{id}` (no-store)
- Error: Deezer อาจตอบ HTTP 200 แต่ body มี `{ "error": {...} }` → ต้องเช็กเสมอ

### 4.2 iTunes Search API — **Fallback** ✅
- Search: `https://itunes.apple.com/search?term={q}&entity=album&media=music&limit=20`
- Tracks: `https://itunes.apple.com/lookup?id={collectionId}&entity=song&limit=200` (result แรกคือ album, ที่เหลือคือเพลง กรองด้วย `wrapperType === "track" && kind === "song"` — มี music video ปนมาได้; default limit คือ 50 ซึ่งตัดอัลบั้ม deluxe)
- ชื่อ collection มักมี suffix ` - Single` / ` - EP` → ตัดออกแล้วเก็บเป็น `recordType`
- ไม่ต้องใช้ key แต่ limit ต่ำ (~**20 req/นาที**) → cache ให้หนัก
- ปก: แทนที่ `100x100bb` ใน `artworkUrl100` เป็น `1000x1000bb`
- รองรับ `country=th` สำหรับ catalog ไทย (ให้ลอง `th` ก่อนแล้ว fallback `us`)
- อัลบั้มที่มีหลายแผ่น: เรียงด้วย `discNumber` แล้ว `trackNumber`

### 4.3 MusicBrainz + Cover Art Archive — Fallback ลำดับ 3 ✅
- `lib/music/providers/musicbrainz.ts` — ไม่ต้องใช้ key แต่ **ต้องส่ง `User-Agent: musicaso/0.1 ( https://github.com/Lebyzio/musicaso )`** และจำกัด **1 req/วินาที** (`createThrottle` ต่อ instance; request ที่จบ < 40ms = Data Cache hit คืน slot) — 503 = rate limited → retry 1 ครั้ง
- ใช้กับอัลบั้มที่ Deezer/iTunes ไม่มี (AOR/indie/release เก่า เช่น Greg Guidry – Over the Line)
- Search: `GET /ws/2/release-group?query=…&dismax=true` (dismax = ค้นชื่ออัลบั้ม+ศิลปินรวมกันแบบหน้าเว็บ MB; query ธรรมดาค้นแค่ชื่อ) เก็บเฉพาะ Album/EP
- **album id = release-group MBID**; `getAlbum` browse `/release?release-group=` แล้ว `pickRelease()` เลือก release ตัวแทนแบบ deterministic (Official → จำนวนเพลงที่พบบ่อยสุด → CD/Digital → วันที่เก่าสุด → id) แล้ว lookup `/release/{id}?inc=recordings+artist-credits+release-groups+genres` — ห้ามเปลี่ยนกฎนี้โดยไม่จำเป็น เพราะ `k` ในลิงก์เก่าจะไม่ตรง
- ปก: `coverartarchive.org/release-group/{id}/front-250|500|1200` (redirect ไป `*.archive.org`, ช้า 4–6 วินาทีตอน cold) — ไม่มีปกถ้าไม่มี release ไหนใน group มี `cover-art-archive.front`; ผลค้นหาอาจ 404 → `AlbumCard` แสดง ♪
- ไม่มี preview; ความยาวเพลงอาจว่าง (= 0 → weight 1)
- หน้าเว็บรอสีปกไม่เกิน 1.5 วินาที (`getPageAccent` + `after()` ให้ fetch จบไปลง Data Cache) ส่วนการ์ด/OG ใช้ `getAlbumAccent` รอเต็ม

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
  recordType?: RecordType; // "album" | "ep" | "single" | "compilation"
  tracks: Track[];
  externalUrl?: string;  // ลิงก์ไปหน้า Deezer / Apple Music (ใช้ใน attribution)
}

export interface AlbumSummary { source: SourceId; id: string; title: string; artist: string; year?: number; coverThumbUrl: string; trackCount?: number; recordType?: RecordType; }

export interface MusicProvider {
  id: SourceId;
  searchAlbums(query: string): Promise<AlbumSummary[]>;
  getAlbum(id: string): Promise<Album>;
}
```

- Response จาก API ภายนอก **ต้อง parse ด้วย zod** ก่อน map เสมอ
- Cache: ใช้ `fetch(url, { next: { revalidate: 86400 } })` สำหรับ album detail, 3600 สำหรับ search (ค่าอยู่ใน `lib/music/http.ts`) + `Cache-Control: s-maxage` ใน route handler ให้ CDN ช่วยรับโหลด
  - **ตั้งใจไม่เปิด `cacheComponents`**: in-memory cache ของ `"use cache"` ไม่คงอยู่ข้าม request บน Vercel serverless และ `"use cache: remote"` คือ cache store ของ platform (ขัดกับ Non-goals) — ถ้าจะเปลี่ยนให้ถามผู้ใช้ก่อน
- Error: provider โยน `ProviderError` (`not_found` / `rate_limited` / `upstream` / `invalid_response`) → route map เป็น 404/429/502 ผ่าน `lib/api-response.ts` และ response error ต้อง `no-store`
- `/api/search` ไม่ระบุ `source` = Deezer → iTunes → MusicBrainz (ไปตัวถัดไปเมื่อ error หรือได้ 0 ผล) (response บอก `source` ที่ใช้จริงเพื่อทำ attribution)
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
  w: z.literal(1).optional(),         // คะแนนรวมถ่วงน้ำหนักตามความยาวเพลง (ให้หน้า share คำนวณตรงกับ editor)
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
- ถ้า URL ยาวเกิน **1,800 ตัวอักษร** → ตัด/ลดข้อความ `t` ก่อน แล้วเตือนผู้ใช้ใน UI (`fitShareUrl` — binary search ความยาว `t` + ต่อท้าย `…`; ในทางปฏิบัติ 65 เพลง + ข้อความไทย 280 ตัว ยาวแค่ ~560)
- Decode ต้อง **ไม่ throw ไปถึง user**: payload เสีย → แสดงหน้า error ที่เป็นมิตร + ปุ่มกลับหน้าแรก (`decodePayload` คืน `{ ok: false, reason }`)
- ⚠️ Next 16 ส่ง route param มาแบบยัง percent-encoded (`+` → `%2B`) — `decodePayload` จัดการ `decodeURIComponent` ให้แล้ว; เวลาสร้างลิงก์ใหม่ให้ใช้ `encodePayload(payload)` ไม่ใช่ param ดิบ
- Schema อยู่ `lib/share/schema.ts`, codec อยู่ `lib/share/codec.ts`, ค่าที่หน้า share/metadata/OG ใช้ร่วมกันอยู่ `lib/share/review-view.ts`
- ถ้า `k` ไม่ตรงกับจำนวนเพลงปัจจุบัน → แสดง warning แต่ยังแสดงรีวิวตามลำดับเท่าที่ตรง
- โค้ดทั้งหมดอยู่ใน `lib/share/codec.ts` และ **ต้องมี unit test round-trip ครบทุก field**
- encoding ของ `r` มีอยู่แล้วใน `lib/share/ratings.ts` (`encodeRatings` / `decodeRatings` / `fitRatings`) — draft ใช้อยู่ ห้ามเขียนซ้ำใน codec

### 5.3 Flow "รีวิวต่อ"
หน้า `/r/{payload}` มีปุ่ม **"Review it yourself"** → ไป `/album/{s}/{a}?from={payload}`
→ editor เปิดเปล่า แต่โชว์คะแนนของคนก่อนเป็น ghost/side-by-side → ตอนแชร์ใส่ `ref` เพื่อให้หน้า share แสดงการเปรียบเทียบ 2 คนได้ (เก็บ `ref` ได้แค่ 1 ชั้น ไม่ซ้อนต่อ)
- `?from=` ถูก decode ฝั่ง server ใน `app/album/[source]/[id]/page.tsx` และใช้เฉพาะเมื่อ `s`/`a` ตรงกับอัลบั้ม
- ชื่อผู้รีวิวจำข้ามอัลบั้มไว้ที่ `localStorage` key `musicaso:name` (ชื่ออย่างเดียวไม่ทำให้เกิด draft)

---

## 6. Scoring Rules

`lib/score.ts` — pure functions ทั้งหมด + unit test
- คะแนนเพลง: 0–10 ทีละ 0.5
- **Album score = ค่าเฉลี่ยของเพลงที่ให้คะแนนแล้วและไม่ถูกข้าม** แสดงทศนิยม 1 ตำแหน่ง
- Option (toggle ใน UI, เก็บใน payload ภายหลังถ้าต้องการ): ถ่วงน้ำหนักตามความยาวเพลง
- ข้อมูลเสริมที่คำนวณได้: เพลงคะแนนสูงสุด/ต่ำสุด, ส่วนเบี่ยงเบน (ความ "สม่ำเสมอ" ของอัลบั้ม), จำนวนเพลงที่ ≥ 8
- Verdict label ตามช่วงคะแนน (เช่น 9+ "Masterpiece", 8+ "Great", 6.5+ "Good", 5+ "Mixed", ต่ำกว่า "Skip") — กำหนดไว้ที่เดียวใน `lib/score.ts` และคิดจากคะแนน **หลังปัดทศนิยม** (8.95 แสดง 9.0 → Masterpiece)
- คะแนนในโค้ดเก็บเป็น **half-step จำนวนเต็ม 0–20** (`Rating = number | "skip" | null`) แปลงเป็น 0–10 ด้วย `toScore()` เฉพาะตอนแสดงผล/คำนวณ
- ความสม่ำเสมอ ("Flow") ใช้ SD: ≤0.75 Rock solid, ≤1.5 Consistent, ≤2.5 Uneven, มากกว่านั้น All over the place (ต้องมี ≥3 เพลงที่ให้คะแนน)

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
  api/preview/[source]/[trackId]/route.ts  # 302 ไป preview URL สดของ Deezer
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
  fonts.ts                          # ฟอนต์สำหรับ render รูป (Satori + resvg)
  render-image.ts                   # renderPng(): satori → resvg-wasm
  accent.ts                         # สีเด่นของปก (jpeg-js) ฝั่ง server
  card/                             # themes, tracks, filename
video/                              # Phase 6 — HyperFrames composition template
  template/index.html
  scripts/render.ts
tests/
```

- `/api/cover` ต้องมี **allowlist host** (Deezer CDN, `*.mzstatic.com`, `coverartarchive.org`) — ห้ามเป็น open proxy — allowlist อยู่ที่ `lib/music/hosts.ts` ที่เดียว (`next.config.ts` import ไปสร้าง `remotePatterns`) และต้องเช็ก host ซ้ำทุก redirect hop
- `next.config.ts`: ตั้ง `images.remotePatterns` ให้ตรงกับ host เดียวกัน

---

## 8. Image Export

- render การ์ดฝั่ง server → ได้ PNG ที่เหมือนกันทุกเครื่อง ไม่มีปัญหา CORS ของ canvas
- ⚠️ **ห้ามใช้ `ImageResponse` ของ `next/og`**: Satori ที่ bundle มา (0.29) ทำให้เครื่องหมายตัวที่สองที่ซ้อนกันในภาษาไทยหายไปกับทุกฟอนต์ (ที่ → ที, ชื่อ → ชือ, ปู่ → ปู) ให้ใช้ `renderPng()` / `pngResponse()` ใน `lib/render-image.ts` แทน
  - ขั้นตอน: `satori` (layout, `embedFont: false` → SVG `<text>`) → `mapFontFamilies()` → `@resvg/resvg-wasm` (shape + วาดตัวอักษรด้วย shaper แบบ HarfBuzz)
  - Satori ใช้ชื่อฟอนต์ของเรา (`Plex`, `Plex Thai`, `Fraunces`) ส่วน resvg ใช้ชื่อ family ที่อยู่ในไฟล์จริง (`IBM Plex Sans Thai`, `Fraunces SemiBold` …) → map ด้วย `realFamily()` ใน `lib/fonts.ts`
  - resvg อ่านได้แค่ sfnt → `lib/woff.ts` แตก WOFF ตอนโหลด
  - Plex ใช้แค่ weight 400 (resvg fallback ระหว่าง subset ไทย/ละตินที่ family เดียวกันโดยไม่สนใจ weight)
  - root element ต้องมี `boxSizing: "border-box"` (Satori รุ่นใหม่บวก padding เพิ่มเข้าไปจาก `width: 100%`)
  - **ห้ามใช้ `boxShadow`**: resvg ทำเป็น Gaussian blur ใช้เวลา ~2 วินาทีต่อใบ ให้ใช้ `components/card/cover-art.tsx` (เงาปลอมจากชั้นโปร่งแสง) → render ~0.3 วินาที
  - ห้ามพิมพ์ glyph ที่ฟอนต์ไม่มี (เช่น ★) เพราะจะเป็นกล่อง ให้วาดเป็น `<svg>` แทน
- 2 format: `square` 1080×1080, `story` 1080×1920 (+ OG 1200×630) — `GET /r/{payload}/card?format=square|story&theme=sleeve|paper|vivid`, `Cache-Control: public, max-age=86400, s-maxage=604800`
- ข้อจำกัดของ Satori: รองรับแค่ flexbox และ CSS subset — ทุก `div` ที่มีลูกหลายตัวต้องมี `display: flex`, ไม่มี grid, ไม่มี Tailwind class (ใช้ inline style), `backgroundImage` ห้ามเป็น `undefined`
- ธีม (`lib/card/themes.ts`): `sleeve` (มืด + เงาเรืองแสงสีปก, default), `paper` (ครีม), `vivid` (พื้นสีปก) — `cardPalette()` รับประกันว่า contrast ของตัวอักษร ≥ 4.5 (มี test); ธีมที่เลือกใน editor ถูกเก็บใน payload `th` (ไม่ใส่ถ้าเป็น default)
- เพลงบนการ์ด (`lib/card/tracks.ts`): square = 3 เพลงคะแนนสูงสุด, story = ทุกเพลงถ้า ≤ 14 เพลง ไม่งั้นใช้ 10 เพลงเด่นเรียงตามลำดับในอัลบั้ม
- ปกในการ์ด/OG ดึงผ่าน Data Cache ตามขนาดที่วาดจริง (`lib/cover-image.ts` → data URI)
- **ฟอนต์ภาษาไทยต้องโหลดเอง** (เช่น Noto Sans Thai / IBM Plex Sans Thai / Anuphan) เป็น `ArrayBuffer` ใน `lib/fonts.ts` ไม่งั้นชื่อเพลงไทยจะเป็นกล่องสี่เหลี่ยม — ทดสอบด้วยอัลบั้มไทยจริงเสมอ
  - ใช้ `loadCardFonts()` + `CARD_FONT.display`/`.body` ใน `lib/fonts.ts`; ไฟล์ `.woff` แบบ static อยู่ใน `assets/fonts/` (commit ไว้) คัดลอกจาก `@fontsource/*` ด้วย `pnpm fonts` — Satori อ่าน woff2/variable font ไม่ได้
  - ⚠️ ห้ามใส่ `letterSpacing` กับข้อความไทยในรูปที่ render — วรรณยุกต์จะหลุดตำแหน่ง
- OG image ต้องมี URL แบบ absolute: `metadataBase` ใน `app/layout.tsx` อ่านจาก `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → localhost
- ปุ่ม Download ฝั่ง client: `fetch(cardUrl)` → blob → `<a download>`; บนมือถือใช้ `navigator.share({ files })` ถ้ารองรับ
- สีหลักจากปก: `getAlbumAccent()` ใน `lib/accent.ts` ดึงปกขนาด 64px → decode ด้วย `jpeg-js` (pure JS) → `accentFromPixels()` — ใช้ร่วมกันทั้งหน้าเว็บ (ใส่ inline ตั้งแต่ SSR), OG และการ์ด

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
- สีของหน้า review ปรับตาม dominant color ของปก (CSS variable `--album-accent`) — `lib/color.ts` (pure, รับ RGBA) เลือกสีสดที่เด่นสุด แล้วปรับให้ contrast ≥ 4.5:1 บนพื้น `ink-950`; ฝั่ง client อ่าน pixel ผ่าน `/api/cover` + canvas (`components/review/album-accent.tsx`) ส่วนการ์ด PNG ใน Phase 4 ให้ใช้ฟังก์ชันเดียวกัน
- Rating input: slider + ปุ่มตัวเลข + keyboard (`←/→` ±0.5, `0–9` ตั้งคะแนนเร็วแล้วเลื่อนไปเพลงถัดไป — `1` ตามด้วย `0` ภายใน 600ms = 10, `S` ข้ามเพลง, `P` เล่น preview, `Backspace` ล้างคะแนน, `↑/↓` เลื่อนเพลง) — tracklist เป็น roving focus (tab stop เดียว)
- คะแนนรวมอัปเดตแบบ live พร้อม animated number
- Mobile-first: ทุกหน้าต้องใช้ได้ดีที่ 375px
- Accessibility: ทุก control ใช้ keyboard ได้, contrast ผ่าน WCAG AA, เคารพ `prefers-reduced-motion`
- Motion:
  - เปลี่ยนหน้าใช้ React `<ViewTransition>` (ห่อ `children` ใน `app/layout.tsx`) — ปกในผลค้นหาและ header ใช้ชื่อเดียวกันจาก `coverTransitionName()` + `share="morph" default="none"`; header ตรึงไว้ด้วย `view-transition-name: site-header`; CSS อยู่ท้าย `globals.css`
  - หน้า `/r`: `components/share/reveal.tsx` (count-up, แถว/แถบคะแนนโผล่ตอนเลื่อนถึง)
  - **หน้า editor ห้าม import `motion`** — ใช้ `AnimatedNumber` (rAF เขียนเอง) และ `usePrefersReducedMotion()` ใน `components/ui/` เพื่อให้ Lighthouse หน้า album ≥ 90
- Performance (Lighthouse mobile ≥ 90 ทุกหน้า — วัดด้วย `next build && next start` + `npx lighthouse`):
  - ห้ามใส่ `transition` ให้ custom property ที่ inherit บน `:root` (เคยทำให้ style/layout 2.3 วินาที)
  - **ห้ามให้ zod ไปอยู่ใน bundle ฝั่ง client**: client import `lib/share/encode.ts` / `lib/share/limits.ts` เท่านั้น (ไม่ใช่ `codec.ts` / `schema.ts`) และ draft ตรวจด้วยฟังก์ชันธรรมดา
  - รูป LCP (ปกใน header) ใช้ `preload` ของ `next/image` (Next 16 เลิกใช้ `priority`); `imageSizes` มี 448 สำหรับปกบนมือถือ
  - ฟอนต์เว็บ: Fraunces/Geist ใช้แค่ subset `latin` ไม่มีแกนเพิ่ม, Geist Mono ไม่ preload
  - Streaming metadata (Next 16): หน้า dynamic ส่ง `<title>`/description/OG ต่อท้ายใน `<body>` ให้ browser ทั่วไป → Lighthouse SEO หน้า album/`/r` บน prod ได้ 92 ("no meta description") — **ตั้งใจไม่แก้**: บอท link preview (facebookexternalhit, LINE `line-poker`, Twitterbot/Telegram, Discordbot, Slackbot, WhatsApp) อยู่ใน `HTML_LIMITED_BOT_UA_RE` ได้ metadata ใน `<head>` ครบ (ตรวจด้วย `curl -A` แล้ว) ส่วน `htmlLimitedBots: /.*/` จะทำให้ TTFB/LCP แย่ลงทุก request

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
- [x] `create-next-app` (TS, App Router, Tailwind, ESLint, pnpm) ใน repo `musicaso`
- [x] เพิ่ม scripts `typecheck`, `test`; ติดตั้ง vitest, zod, lz-string, motion
- [x] ตั้ง design tokens + ฟอนต์ (รวมฟอนต์ไทย) + layout หลัก

### Phase 1 — Data Layer
- [x] types กลาง + Deezer provider + iTunes provider (zod schema + mapper + tests ด้วย fixture JSON)
- [x] `/api/search`, `/api/cover` (allowlist)
- [x] หน้าแรก: search box (debounce 300ms) + ผลลัพธ์เป็น grid ปก

### Phase 2 — Review Editor
- [x] `/album/[source]/[id]`: header อัลบั้ม, tracklist, rating input ต่อเพลง, ปุ่มข้ามเพลง, preview 30s
- [x] `lib/score.ts` + live album score + verdict
- [x] autosave draft ลง `localStorage` (key: `musicaso:draft:{source}:{id}`)

### Phase 3 — Share Link
- [x] `lib/share/codec.ts` + tests (round-trip, payload เสีย, URL ยาวเกิน)
- [x] `/r/[payload]` read-only view + `generateMetadata` + `opengraph-image`
- [x] ปุ่ม Copy link / Web Share API
- [x] Flow "Review it yourself" + เปรียบเทียบกับ `ref`

### Phase 4 — Image Export
- [x] `/r/[payload]/card?format=square|story` + ฟอนต์ไทย + dominant color (satori + resvg-wasm แทน `ImageResponse`)
- [x] ปุ่มดาวน์โหลด / แชร์ไฟล์บนมือถือ
- [x] 2–3 ธีมการ์ด

### Phase 5 — Polish
- [x] Animation (page transition, score count-up, track reveal), reduced-motion
- [x] Empty/loading/error states ครบ, skeleton
- [x] Lighthouse ≥ 90 ทุกหมวดบนมือถือ, deploy Vercel — https://musicaso.vercel.app (import จาก GitHub, push `main` = deploy) — Lighthouse mobile บน prod: หน้าแรก 97/100/100/100, album 92–93/100/100/92, `/r` 93/100/100/92 (SEO 92 = streaming metadata ดูหัวข้อ 10)

### Phase 6 — Short Video (HyperFrames)
- [ ] composition template 9:16 + data injection
- [ ] `pnpm video <shareUrl>` render MP4 บนเครื่อง
- [ ] (optional) preview ในเว็บด้วย `<hyperframes-player>`

### Phase 7 — Catalog กว้างขึ้น + ภาษาไทย + Top list
- [x] ค้นด้วยชื่อศิลปิน → แถบ discography จาก Deezer (`/search/artist` → `/artist/{id}/albums`) เหนือผลค้นหา
- [x] MusicBrainz provider + Cover Art Archive (fallback Deezer → iTunes → MusicBrainz)
- [x] i18n foundation (cookie `musicaso-lang` + Accept-Language, ปุ่มสลับ EN/ไทย)
- [ ] UI ภาษาไทยครบทุกหน้า + การ์ด/OG ภาษาไทย (payload `l`)
- [ ] `/library` รีวิวของฉัน (draft + meta)
- [ ] Top list ของปี `/l/{payload}` + การ์ด + OG
