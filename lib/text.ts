const THAI = /[฀-๿]/;

/** Thai stacks vowels and tone marks above/below the line, so it needs looser leading than Latin. */
export function hasThai(text: string): boolean {
  return THAI.test(text);
}

/** 245 → "4:05" */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** 2580 → "43 min", 4380 → "1 hr 13 min" */
export function formatLength(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} hr ${min % 60} min`;
}
