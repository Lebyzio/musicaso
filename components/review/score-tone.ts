/** Text colour class for a 0–10 score, aligned with the verdict bands in lib/score.ts. */
export function scoreTone(score: number): string {
  if (score >= 8) return "text-score-high";
  if (score >= 5) return "text-score-mid";
  return "text-score-low";
}
