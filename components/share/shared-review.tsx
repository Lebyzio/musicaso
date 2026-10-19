import { AlbumAccent } from "@/components/review/album-accent";
import { AlbumHeader } from "@/components/review/album-header";
import { scoreTone } from "@/components/review/score-tone";
import { AGREE_WITHIN } from "@/lib/compare";
import type { Album } from "@/lib/music/types";
import { formatScore, isScored, type Rating, toScore } from "@/lib/score";
import type { ReviewView } from "@/lib/share/review-view";
import { formatDuration, hasThai } from "@/lib/text";
import { ShareActions } from "./share-actions";

interface SharedReviewProps {
  album: Album;
  view: ReviewView;
  reviewItHref: string;
  title: string;
}

function Bar({ rating, muted = false }: { rating: Rating; muted?: boolean }) {
  const pct = isScored(rating) ? (toScore(rating) / 10) * 100 : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
      <div
        className={`h-full rounded-full ${muted ? "bg-paper-mute/60" : "bg-accent"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AverageText({ score }: { score: number | null }) {
  if (score === null) return <span className="font-mono text-paper-mute">–</span>;
  return <span className={`font-mono ${scoreTone(score)}`}>{formatScore(score)}</span>;
}

function ScoreText({ rating, className = "" }: { rating: Rating; className?: string }) {
  if (rating === "skip") return <span className={`text-paper-mute ${className}`}>skip</span>;
  if (rating === null) return <span className={`text-paper-mute ${className}`}>–</span>;
  const score = toScore(rating);
  return <span className={`${scoreTone(score)} ${className}`}>{formatScore(score)}</span>;
}

export function SharedReview({ album, view, reviewItHref, title }: SharedReviewProps) {
  const who = view.name ?? "Someone";
  const refWho = view.reference?.name ?? "Original";
  const { comparison, stats } = view;
  const multiDisc = new Set(album.tracks.map((t) => t.disc)).size > 1;

  return (
    <div className="flex flex-col gap-10 pb-24">
      <AlbumAccent coverUrl={album.coverThumbUrl} />

      {view.mismatch && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-score-mid/40 bg-score-mid/10 p-4 text-sm text-paper-dim"
        >
          This album’s tracklist has changed since the review was written, so scores are shown by
          track order and may not line up exactly.
        </p>
      )}

      <AlbumHeader album={album} />

      <section className="grid gap-8 rounded-card border border-ink-700 bg-ink-900/70 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.25em] text-paper-mute uppercase">
            <span className={hasThai(who) ? "tracking-normal normal-case" : ""}>{who}</span>’s
            verdict
          </p>
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-8xl leading-none font-medium text-accent tabular">
              {formatScore(view.score)}
            </span>
            <span className="font-display text-3xl text-paper-dim italic">
              {view.verdict ?? "Unrated"}
            </span>
          </div>
          <p className="text-xs text-paper-mute tabular">
            {stats.scored} of {stats.total} tracks rated
            {stats.skipped > 0 && ` · ${stats.skipped} skipped`}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-6">
          {view.text && (
            <blockquote className="flex flex-col gap-2">
              <p
                className={`font-display text-2xl text-paper italic ${
                  hasThai(view.text) ? "leading-relaxed not-italic" : "leading-snug"
                }`}
              >
                “{view.text}”
              </p>
              <footer className="text-sm text-paper-mute">— {who}</footer>
            </blockquote>
          )}

          {comparison && (
            <div className="flex flex-col gap-3 rounded-xl bg-ink-800/60 p-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <span className="flex items-baseline gap-2">
                  <span className="size-2 rounded-full bg-accent" aria-hidden />
                  {who}
                  <AverageText score={comparison.scoreA} />
                </span>
                <span className="text-paper-mute">vs</span>
                <span className="flex items-baseline gap-2">
                  <span className="size-2 rounded-full bg-paper-mute/60" aria-hidden />
                  {refWho}
                  <AverageText score={comparison.scoreB} />
                </span>
              </div>
              {comparison.both > 0 && (
                <p className="text-paper-dim">
                  Agree on {comparison.agree} of {comparison.both} tracks (within {AGREE_WITHIN}{" "}
                  point).
                  {comparison.biggestSplit && (
                    <>
                      {" "}
                      Biggest split:{" "}
                      <span className="text-paper">
                        {album.tracks[comparison.biggestSplit.index]?.title}
                      </span>{" "}
                      <span className="font-mono tabular">
                        (Δ{formatScore(comparison.biggestSplit.diff)})
                      </span>
                      .
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          <ShareActions reviewItHref={reviewItHref} title={title} />
        </div>
      </section>

      <section aria-labelledby="shared-tracklist" className="flex flex-col gap-2">
        <h2
          id="shared-tracklist"
          className="px-1 text-xs tracking-[0.25em] text-paper-mute uppercase"
        >
          Track by track
        </h2>
        <ol className="flex flex-col">
          {album.tracks.map((track, i) => {
            const rating = view.ratings[i];
            const refRating = view.reference?.ratings[i] ?? null;
            const showDisc = multiDisc && (i === 0 || album.tracks[i - 1].disc !== track.disc);
            return (
              <li key={track.id} className="flex flex-col">
                {showDisc && (
                  <p className="px-1 pt-6 pb-2 text-xs tracking-[0.25em] text-accent uppercase">
                    Disc {track.disc}
                  </p>
                )}
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-ink-800 px-1 py-3">
                  <span className="text-right text-sm text-paper-mute tabular">
                    {track.position}
                  </span>
                  <div className={`min-w-0 ${rating === "skip" ? "opacity-45" : ""}`}>
                    <p className="line-clamp-2 leading-normal text-paper">
                      {i === view.favorite && (
                        <span className="mr-1.5 text-accent" title="Favourite track">
                          ★<span className="sr-only">Favourite:</span>
                        </span>
                      )}
                      {track.title}
                    </p>
                    <p className="text-xs text-paper-mute tabular">
                      {formatDuration(track.durationSec)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end font-mono tabular">
                    <ScoreText rating={rating} className="text-xl" />
                    {view.reference && (
                      <span className="text-xs text-paper-mute">
                        {refRating === "skip"
                          ? "skip"
                          : isScored(refRating)
                            ? formatScore(toScore(refRating))
                            : "–"}
                      </span>
                    )}
                  </div>
                  <div className="col-start-2 col-end-4 flex flex-col gap-1">
                    <Bar rating={rating} />
                    {view.reference && <Bar rating={refRating} muted />}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
