export default function Home() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-8 py-16 sm:py-24">
      <p className="text-xs tracking-[0.25em] text-accent uppercase">Side A · Track 01</p>
      <h1 className="max-w-3xl font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-7xl">
        Rate every track.
        <br />
        <span className="text-paper-dim italic">Share the verdict.</span>
      </h1>
      <p className="max-w-xl text-lg text-pretty text-paper-dim">
        Score an album song by song, watch the average settle, then send it as a link or a card
        ready for your story.
      </p>
      <p lang="th" className="max-w-xl text-paper-mute">
        ให้คะแนนทีละเพลง ดูคะแนนเฉลี่ยของทั้งอัลบั้ม แล้วแชร์ได้ในลิงก์เดียว
      </p>

      <div
        aria-hidden
        className="mt-4 flex w-full max-w-md items-center justify-between rounded-card border border-ink-700 bg-ink-900 p-5"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs tracking-[0.2em] text-paper-mute uppercase">Album score</span>
          <span className="font-display text-sm text-paper-dim italic">Great</span>
        </div>
        <span className="font-mono text-5xl font-medium text-accent tabular">8.4</span>
      </div>
    </section>
  );
}
