import type { Dictionary } from "./en";

/** Thai UI copy. Same shape as `en` — a missing key fails the typecheck. */
export const th: Dictionary = {
  meta: {
    title: "musicaso — ให้คะแนนอัลบั้มทีละเพลง",
    description:
      "ให้คะแนนทุกเพลง ได้คะแนนรวมของอัลบั้ม แล้วแชร์รีวิวเป็นลิงก์หรือการ์ดรูปภาพ ไม่ต้องสมัครสมาชิก",
    albumFallback: "อัลบั้ม",
    albumDescription: (title, artist) =>
      `ให้คะแนน ${title} ของ ${artist} ทีละเพลง แล้วแชร์คำตัดสินของคุณ`,
    reviewTitle: (name, album, score, verdict) =>
      `${name ? `${name} รีวิว` : "รีวิว"} ${album} — ${score}${verdict ? ` ${verdict}` : ""}`,
    reviewDescription: (name, album, artist, score) =>
      `${name ?? "มีคน"}ให้คะแนน ${album} ของ ${artist} ทีละเพลง: ${score}/10`,
    brokenTitle: "ลิงก์รีวิวเสีย",
    reviewFallback: "รีวิวอัลบั้ม",
  },

  nav: {
    skipToContent: "ข้ามไปที่เนื้อหา",
    tagline: "รีวิวอัลบั้มทีละเพลง",
    language: "ภาษา",
  },

  footer: {
    noDatabase: "ไม่มีบัญชี ไม่มีฐานข้อมูล — รีวิวของคุณอยู่ในลิงก์",
    data: "ข้อมูลอัลบั้มจาก Deezer, Apple Music และ MusicBrainz",
  },

  home: {
    kicker: "หน้า A · เพลงที่ 01",
    title: "ให้คะแนนทุกเพลง",
    titleAccent: "แล้วแชร์คำตัดสิน",
    lead: "ค้นหาอัลบั้ม ให้คะแนนทีละเพลง แล้วส่งคำตัดสินเป็นลิงก์หรือการ์ด",
  },

  search: {
    label: "ค้นหาอัลบั้ม",
    region: "ค้นหาอัลบั้ม",
    placeholder: "ค้นหาอัลบั้มหรือศิลปิน",
    clear: "ล้างคำค้น",
    try: "ลอง",
    searching: "กำลังค้นหา…",
    found: (n) => `พบ ${n} อัลบั้ม`,
    failed: "ค้นหาไม่สำเร็จ",
    results: (n) => `${n} ผลลัพธ์`,
    moreResults: "ผลอื่น ๆ",
    dataFrom: (source) => `ข้อมูลจาก ${source}`,
    tryOther: (source) => `ลอง ${source}`,
    searchInstead: (source) => `ค้นใน ${source} แทน`,
    busy: "แคตตาล็อกเพลงกำลังยุ่ง รอสักครู่แล้วลองใหม่",
    offline: "เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
    unreachable: "ติดต่อแคตตาล็อกเพลงไม่ได้",
    tryAgain: "ลองอีกครั้ง",
    nothingFor: (query) => ({ before: "ไม่พบ “", query, after: "”" }),
    hint: "ตรวจตัวสะกด หรือลองค้นด้วยชื่อศิลปิน",
    albumsBy: (name) => `อัลบั้มของ ${name}`,
    showAll: (n) => `ดูทั้งหมด ${n} อัลบั้ม`,
    showFewer: "ย่อลง",
    resultsRegion: "ผลการค้นหา",
  },

  album: {
    recordType: { album: "อัลบั้ม", ep: "EP", single: "ซิงเกิล", compilation: "รวมเพลง" },
    tracks: (n) => `${n} เพลง`,
    discs: (n) => `${n} แผ่น`,
    length: ({ hours, minutes }) =>
      hours > 0 ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`,
    disc: (n) => `แผ่นที่ ${n}`,
    dataFrom: (source) => `ข้อมูลจาก ${source}`,
    coverOf: (title) => `ปกอัลบั้ม ${title}`,
  },

  editor: {
    tracklist: "รายชื่อเพลง",
    shortcuts: "คีย์ลัด",
    shortcut: {
      adjust: "±0.5",
      score: "ให้คะแนน",
      skip: "ข้าม",
      preview: "ฟังตัวอย่าง",
      track: "เลื่อนเพลง",
    },
    originalReviewer: "ผู้รีวิวคนแรก",
    alongside: {
      before: "กำลังรีวิวคู่กับ ",
      after: " คะแนนของเขาแสดงเป็นขีดจาง ๆ — ลิงก์ของคุณจะมีการเปรียบเทียบแบบเคียงกัน",
    },
    mismatch:
      "รายชื่อเพลงของอัลบั้มนี้เปลี่ยนไปตั้งแต่คุณเริ่มให้คะแนน คะแนนถูกจับคู่ตามลำดับเพลง ลองตรวจดูอีกรอบ",
    dismiss: "ปิด",
    notRated: "ยังไม่ให้คะแนน",
    skipped: "ข้ามแล้ว",
    skip: "ข้าม",
    skipShort: "ข้าม",
    outOf10: (score) => `${score} จาก 10`,
    ratingFor: (title) => `คะแนนของ ${title}`,
    quickScore: "ให้คะแนนเร็ว",
    scoreN: (n) => `ให้ ${n} คะแนน`,
    noPreviewFor: (title) => `ไม่มีตัวอย่างของ ${title}`,
    playPreview: (title) => `เล่นตัวอย่าง ${title}`,
    stopPreview: (title) => `หยุดตัวอย่าง ${title}`,
    noPreview: "ไม่มีเพลงตัวอย่าง",
  },

  score: {
    albumScore: "คะแนนอัลบั้ม",
    unrated: "ยังไม่มีคะแนน",
    tracksRated: "เพลงที่ให้คะแนนแล้ว",
    ratedOf: (scored, total) => `ให้คะแนนแล้ว ${scored} จาก ${total}`,
    skippedN: (n) => `ข้าม ${n}`,
    theirScore: (name) => `คะแนนของ ${name}`,
    best: "ดีที่สุด",
    weakest: "อ่อนสุด",
    eightPlus: "8+",
    tracksN: (n) => `${n} เพลง`,
    flow: "ความต่อเนื่อง",
    weight: "ถ่วงน้ำหนักตามความยาวเพลง",
    weightHint: "เพลงยาวมีผลต่อคะแนนมากกว่า",
    draftSaved: "บันทึกฉบับร่างไว้ในเบราว์เซอร์นี้แล้ว",
    draftFailed: "บันทึกฉบับร่างในเบราว์เซอร์นี้ไม่ได้",
    clearAll: "ล้างทั้งหมด",
    tapAgain: "แตะอีกครั้งเพื่อล้าง",
    share: "แชร์",
  },

  verdict: {
    Masterpiece: "ระดับตำนาน",
    Great: "ยอดเยี่ยม",
    Good: "ดี",
    Mixed: "กลาง ๆ",
    Skip: "ข้ามได้",
  },

  consistency: {
    "Rock solid": "แน่นทั้งแผ่น",
    Consistent: "สม่ำเสมอ",
    Uneven: "มีขึ้นมีลง",
    "All over the place": "แกว่ง",
  },

  share: {
    heading: "แชร์รีวิวของคุณ",
    yourName: "ชื่อของคุณ",
    optional: "ไม่ใส่ก็ได้",
    yourTake: "ความเห็นของคุณ",
    takePlaceholder: "สักหนึ่งสองบรรทัดเกี่ยวกับอัลบั้มนี้",
    truncated: (chars, limit) =>
      `ข้อความถูกตัดเหลือ ${chars} ตัวอักษรในลิงก์ เพื่อให้ลิงก์ยาวไม่เกิน ${limit} ตัวอักษร`,
    tooLong: "รีวิวนี้ยาวเกินกว่าจะใส่ในลิงก์ได้",
    rateFirst: "ให้คะแนนอย่างน้อยหนึ่งเพลงก่อนแชร์",
    copyLink: "คัดลอกลิงก์",
    copied: "คัดลอกแล้ว!",
    pressToCopy: "กด Ctrl+C เพื่อคัดลอก",
    linkCopied: "คัดลอกลิงก์แล้ว",
    share: "แชร์…",
    preview: "ดูตัวอย่าง ↗",
    imageCard: "การ์ดรูปภาพ",
    shareTitle: (name, album) => (name ? `${name} รีวิว ${album}` : `รีวิว ${album} ของฉัน`),
    reviewIt: "รีวิวเองบ้าง",
  },

  card: {
    format: "ขนาดการ์ด",
    theme: "ธีมการ์ด",
    formats: { square: "สี่เหลี่ยม", story: "สตอรี่" },
    themes: { sleeve: "ปกแผ่นเสียง", paper: "กระดาษ", vivid: "สีสด" },
    preparing: "กำลังเตรียมรูป…",
    downloaded: "ดาวน์โหลดการ์ดแล้ว",
    failed: "สร้างการ์ดไม่สำเร็จ ลองอีกครั้ง",
    shareFailed: "แชร์ไม่สำเร็จ — ลองดาวน์โหลดแทน",
    previewAlt: (format) => `ตัวอย่างการ์ดแบบ${format}`,
    unavailable: "แสดงตัวอย่างไม่ได้",
    rateToSee: "ให้คะแนนสักเพลงเพื่อดูการ์ด",
    download: "ดาวน์โหลด PNG",
    shareImage: "แชร์รูป…",
  },

  shared: {
    someone: "ใครสักคน",
    original: "ต้นฉบับ",
    verdictOf: { before: "คำตัดสินของ ", after: "" },
    noScores: "ยังไม่มีคะแนน",
    tracksRated: (scored, total) => `ให้คะแนน ${scored} จาก ${total} เพลง`,
    vs: "กับ",
    agree: (agree, both, within) =>
      `เห็นตรงกัน ${agree} จาก ${both} เพลง (ต่างกันไม่เกิน ${within} คะแนน)`,
    biggestSplit: "เห็นต่างมากที่สุด:",
    trackByTrack: "ทีละเพลง",
    favourite: "เพลงโปรด",
    favouriteSr: "เพลงโปรด:",
    mismatch:
      "รายชื่อเพลงของอัลบั้มนี้เปลี่ยนไปหลังจากเขียนรีวิว คะแนนจึงแสดงตามลำดับเพลงและอาจไม่ตรงทุกเพลง",
  },

  status: {
    loadingAlbum: "กำลังโหลดอัลบั้ม",
    loadingReview: "กำลังโหลดรีวิว",
    brokenKicker: "แทร็กหาย",
    broken: {
      empty: {
        title: "ลิงก์นี้ไม่มีรีวิวอยู่ข้างใน",
        body: "ดูเหมือนว่าคัดลอกลิงก์มาไม่ครบ",
      },
      corrupt: {
        title: "ลิงก์รีวิวนี้เสีย",
        body: "ลิงก์อาจถูกตัดหรือเปลี่ยนไประหว่างคัดลอก ลองขอลิงก์เต็มอีกครั้ง",
      },
      unsupported_version: {
        title: "รีวิวนี้สร้างด้วย musicaso เวอร์ชันใหม่กว่า",
        body: "ลองรีเฟรชหน้า — ถ้ายังเปิดไม่ได้ แปลว่าเวอร์ชันนี้ยังอ่านไม่ได้",
      },
      album_gone: {
        title: "อัลบั้มนี้ไม่มีให้ดูแล้ว",
        body: "แคตตาล็อกเพลงไม่มีอัลบั้มที่รีวิวนี้พูดถึงแล้ว",
      },
    },
    reviewYourself: "รีวิวอัลบั้มเอง",
    loadKicker: "กำลังข้าม…",
    loadTitle: "โหลดอัลบั้มนี้ไม่ได้",
    busy: "แคตตาล็อกเพลงกำลังยุ่ง รอสักครู่แล้วลองใหม่",
    unexpected: "แคตตาล็อกเพลงตอบกลับผิดปกติ ลองใหม่อีกครั้งในอีกสักครู่",
    retrying: "กำลังลองใหม่…",
    tryAgain: "ลองอีกครั้ง",
    backToSearch: "กลับไปค้นหา",
    errorKicker: "แผ่นสะดุด",
    errorTitle: "มีบางอย่างผิดพลาด",
    errorBody: "หน้านี้เกิดข้อผิดพลาดที่ไม่คาดคิด คะแนนของคุณยังบันทึกอยู่ในเบราว์เซอร์นี้",
    notFoundKicker: "404 · แทร็กลับ",
    notFoundTitle: "ด้านนี้ไม่มีอะไร",
    notFoundBody: "ไม่พบอัลบั้มหรือรีวิวนั้น ลิงก์อาจไม่ครบ หรืออัลบั้มถูกนำออกจากแคตตาล็อกแล้ว",
    searchAlbums: "ค้นหาอัลบั้ม",
    emptyTitle: "ไม่มีรายชื่อเพลง",
    emptyBody: (source) => `${source} ยังไม่มีรายชื่อเพลงของอัลบั้มนี้ ลองเปิดอัลบั้มฉบับอื่นดู`,
    searchAgain: "ค้นหาใหม่",
  },

  image: {
    verdictOf: { before: "คำตัดสินของ ", after: "" },
    albumReview: "รีวิวอัลบั้ม",
    tracksRated: (scored, total) => `ให้คะแนน ${scored} จาก ${total} เพลง`,
    vs: (name, score) => `กับ ${name} · ${score}`,
    original: "ต้นฉบับ",
    reviewer: "ผู้รีวิว",
    highlights: "เพลงเด่น",
    topTracks: "เพลงเด่น",
    trackByTrack: "ทีละเพลง",
    skip: "ข้าม",
    dataFrom: (source) => `ข้อมูลจาก ${source}`,
  },
};
