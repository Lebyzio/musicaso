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
/** Album running time in whole minutes, split for display ("1 hr 5 min" / "1 ชม. 5 นาที"). */
export function splitLength(totalSec: number): { hours: number; minutes: number } {
  const min = Math.round(totalSec / 60);
  return { hours: Math.floor(min / 60), minutes: min % 60 };
}
