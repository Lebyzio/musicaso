import type { Consistency, Verdict } from "@/lib/score";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * English UI copy — the source of truth. `th.ts` must have the same shape (checked by its type).
 * Functions take the values to interpolate; keep them pure so they work on server and client.
 */
export const en = {
  meta: {
    title: "musicaso — rate albums track by track",
    description:
      "Rate every track, get the album score, and share your review as a link or an image card. No sign-up.",
    albumFallback: "Album",
    albumDescription: (title: string, artist: string) =>
      `Rate ${title} by ${artist} track by track and share your verdict.`,
    reviewTitle: (name: string | undefined, album: string, score: string, verdict: string) =>
      `${name ? `${name} on` : "A review of"} ${album} — ${score}${verdict ? ` ${verdict}` : ""}`,
    reviewDescription: (name: string | undefined, album: string, artist: string, score: string) =>
      `${name ?? "Someone"} rated ${album} by ${artist} track by track: ${score}/10.`,
    brokenTitle: "Broken review link",
    reviewFallback: "Album review",
  },

  nav: {
    skipToContent: "Skip to content",
    tagline: "Track-by-track album reviews",
    language: "Language",
    library: "My reviews",
  },

  library: {
    title: "Your reviews",
    description: "Every album you’ve rated in this browser.",
    kicker: "Saved in this browser",
    lead: "Every album you’ve rated here. Nothing leaves this browser until you share a link.",
    count: (n: number) => plural(n, "album", "albums"),
    loading: "Loading your reviews",
    emptyTitle: "No reviews yet.",
    emptyBody: "Rate an album and it shows up here, ready to finish or share.",
    findAlbum: "Find an album",
    noDetails: "Open it once more to show its details",
    edited: (date: string) => `Edited ${date}`,
    remove: "Remove",
    confirmRemove: "Tap again to remove",
    removeLabel: (title: string) => `Remove the review of ${title}`,
  },

  footer: {
    noDatabase: "No accounts, no database — your review lives in the link.",
    data: "Album data from Deezer, Apple Music & MusicBrainz.",
  },

  home: {
    kicker: "Side A · Track 01",
    title: "Rate every track.",
    titleAccent: "Share the verdict.",
    lead: "Find an album, score it song by song, and send the verdict as a link or a card.",
  },

  search: {
    label: "Search albums",
    region: "Album search",
    placeholder: "Search an album or artist",
    clear: "Clear search",
    try: "Try",
    searching: "Searching…",
    found: (n: number) => `${plural(n, "album", "albums")} found`,
    failed: "Search failed",
    results: (n: number) => plural(n, "result", "results"),
    moreResults: "More results",
    dataFrom: (source: string) => `Data from ${source}`,
    tryOther: (source: string) => `Try ${source}`,
    searchInstead: (source: string) => `Search ${source} instead`,
    busy: "The music catalogue is busy right now — give it a few seconds.",
    offline: "Couldn’t connect. Check your connection and try again.",
    unreachable: "We couldn’t reach the music catalogue.",
    tryAgain: "Try again",
    nothingFor: (query: string) => ({ before: "Nothing for “", query, after: "”." }),
    hint: "Check the spelling, or search by artist name.",
    albumsBy: (name: string) => `Albums by ${name}`,
    showAll: (n: number) => `Show all ${n}`,
    showFewer: "Show fewer",
    resultsRegion: "Search results",
  },

  album: {
    recordType: { album: "Album", ep: "EP", single: "Single", compilation: "Compilation" },
    tracks: (n: number) => plural(n, "track", "tracks"),
    discs: (n: number) => `${n} discs`,
    length: ({ hours, minutes }: { hours: number; minutes: number }) =>
      hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`,
    disc: (n: number) => `Disc ${n}`,
    dataFrom: (source: string) => `Data from ${source}`,
    coverOf: (title: string) => `Cover of ${title}`,
  },

  editor: {
    tracklist: "Tracklist",
    shortcuts: "Keyboard shortcuts",
    shortcut: { adjust: "±0.5", score: "score", skip: "skip", preview: "preview", track: "track" },
    originalReviewer: "The original reviewer",
    alongside: {
      before: "Reviewing alongside ",
      after:
        ". Their scores show as faint marks — your link will include a side-by-side comparison.",
    },
    mismatch:
      "This album’s tracklist changed since you started rating it. Your scores were matched by track order — give them a quick check.",
    dismiss: "Dismiss",
    notRated: "Not rated",
    skipped: "Skipped",
    skip: "Skip",
    skipShort: "skip",
    outOf10: (score: string) => `${score} out of 10`,
    ratingFor: (title: string) => `Rating for ${title}`,
    quickScore: "Quick score",
    scoreN: (n: number) => `Score ${n}`,
    noPreviewFor: (title: string) => `No preview for ${title}`,
    playPreview: (title: string) => `Play preview of ${title}`,
    stopPreview: (title: string) => `Stop preview of ${title}`,
    noPreview: "No preview available",
  },

  score: {
    albumScore: "Album score",
    unrated: "Unrated",
    tracksRated: "Tracks rated",
    ratedOf: (scored: number, total: number) => `${scored} of ${total} rated`,
    skippedN: (n: number) => `${n} skipped`,
    theirScore: (name: string) => `${name}’s score`,
    best: "Best",
    weakest: "Weakest",
    eightPlus: "8+",
    tracksN: (n: number) => plural(n, "track", "tracks"),
    flow: "Flow",
    weight: "Weight by track length",
    weightHint: "Long songs count for more",
    draftSaved: "Draft saved in this browser",
    draftFailed: "Couldn’t save a draft in this browser",
    clearAll: "Clear all",
    tapAgain: "Tap again to clear",
    share: "Share",
  },

  verdict: {
    Masterpiece: "Masterpiece",
    Great: "Great",
    Good: "Good",
    Mixed: "Mixed",
    Skip: "Skip",
  } satisfies Record<Verdict, string>,

  consistency: {
    "Rock solid": "Rock solid",
    Consistent: "Consistent",
    Uneven: "Uneven",
    "All over the place": "All over the place",
  } satisfies Record<Consistency, string>,

  share: {
    heading: "Share your review",
    yourName: "Your name",
    optional: "Optional",
    yourTake: "Your take",
    takePlaceholder: "One or two lines about the album",
    truncated: (chars: number, limit: string) =>
      `Your text is cut to ${chars} characters in the link to keep it under ${limit} characters.`,
    tooLong: "This review is too long to fit in a link.",
    rateFirst: "Rate at least one track to share.",
    copyLink: "Copy link",
    copied: "Copied!",
    pressToCopy: "Press Ctrl+C to copy",
    linkCopied: "Link copied",
    share: "Share…",
    preview: "Preview ↗",
    imageCard: "Image card",
    shareTitle: (name: string, album: string) =>
      name ? `${name}’s review of ${album}` : `My review of ${album}`,
    reviewIt: "Review it yourself",
  },

  card: {
    format: "Card format",
    theme: "Card theme",
    formats: { square: "Square", story: "Story" },
    themes: { sleeve: "Sleeve", paper: "Paper", vivid: "Vivid" },
    preparing: "Preparing image…",
    downloaded: "Card downloaded",
    failed: "Couldn’t create the card. Try again.",
    shareFailed: "Sharing didn’t work — try Download instead.",
    previewAlt: (format: string) => `Preview of the ${format} card`,
    unavailable: "Preview unavailable",
    rateToSee: "Rate a track to see your card",
    download: "Download PNG",
    shareImage: "Share image…",
  },

  shared: {
    someone: "Someone",
    original: "Original",
    verdictOf: { before: "", after: "’s verdict" },
    noScores: "No scores yet",
    tracksRated: (scored: number, total: number) => `${scored} of ${total} tracks rated`,
    vs: "vs",
    agree: (agree: number, both: number, within: number) =>
      `Agree on ${agree} of ${both} tracks (within ${within} point).`,
    biggestSplit: "Biggest split:",
    trackByTrack: "Track by track",
    favourite: "Favourite track",
    favouriteSr: "Favourite:",
    mismatch:
      "This album’s tracklist has changed since the review was written, so scores are shown by track order and may not line up exactly.",
  },

  status: {
    loadingAlbum: "Loading album",
    loadingReview: "Loading review",
    brokenKicker: "Skipped track",
    broken: {
      empty: {
        title: "This link has no review in it.",
        body: "It looks like only part of the link was copied.",
      },
      corrupt: {
        title: "This review link is broken.",
        body: "It may have been cut off or changed when it was copied. Ask for the full link again.",
      },
      unsupported_version: {
        title: "This review was made with a newer musicaso.",
        body: "Refresh the page — if it still won’t open, this version can’t read it yet.",
      },
      album_gone: {
        title: "This album isn’t available anymore.",
        body: "The music catalogue no longer lists the album this review was about.",
      },
    },
    reviewYourself: "Review an album yourself",
    loadKicker: "Skipping…",
    loadTitle: "We couldn’t load this album.",
    busy: "The music catalogue is busy right now. Give it a few seconds and try again.",
    unexpected: "The music catalogue didn’t answer as expected. Try again in a moment.",
    retrying: "Retrying…",
    tryAgain: "Try again",
    backToSearch: "Back to search",
    errorKicker: "Scratched record",
    errorTitle: "Something went wrong.",
    errorBody: "This page hit an unexpected error. Your ratings are saved in this browser.",
    notFoundKicker: "404 · Hidden track",
    notFoundTitle: "Nothing on this side.",
    notFoundBody:
      "We couldn’t find that album or review. The link may be incomplete, or the album was removed from the catalogue.",
    searchAlbums: "Search albums",
    emptyTitle: "No tracks listed.",
    emptyBody: (source: string) =>
      `${source} doesn’t list any tracks for this release yet. Another edition of the album may have them.`,
    searchAgain: "Search again",
  },

  /** Text drawn into PNG cards and OG images. */
  image: {
    verdictOf: { before: "", after: "’s verdict" },
    albumReview: "Album review",
    tracksRated: (scored: number, total: number) => `${scored} of ${total} tracks rated`,
    vs: (name: string, score: string) => `vs ${name} · ${score}`,
    original: "Original",
    reviewer: "Reviewer",
    highlights: "Highlights",
    topTracks: "Top tracks",
    trackByTrack: "Track by track",
    skip: "skip",
    dataFrom: (source: string) => `Data from ${source}`,
  },
};

export type Dictionary = typeof en;
