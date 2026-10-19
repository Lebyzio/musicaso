import { describe, expect, it } from "vitest";
import type { Album } from "@/lib/music/types";
import { decodePayload } from "@/lib/share/codec";
import type { ListPayload } from "@/lib/share/list-schema";
import { listView } from "@/lib/share/list-view";

const album = (id: string, durations: number[]): Album => ({
  source: "dz",
  id,
  title: `Album ${id}`,
  artist: "Artist",
  coverUrl: "",
  coverThumbUrl: "",
  tracks: durations.map((durationSec, i) => ({
    id: `${id}-${i}`,
    position: i + 1,
    disc: 1,
    title: `Track ${i + 1}`,
    durationSec,
  })),
});

const list: ListPayload = {
  v: 1,
  n: "Alex",
  i: [
    { s: "dz", a: "1", k: 2, r: "ka", w: 1 },
    { s: "dz", a: "2", k: 1, r: "g" },
  ],
};

describe("listView", () => {
  it("ranks entries, scores them like their reviews and links each one", () => {
    const view = listView(list, [
      { ok: true, album: album("1", [300, 100]) },
      { ok: false, code: "not_found" },
    ]);

    expect(view[0]).toMatchObject({ rank: 1, album: { id: "1" } });
    // Length-weighted: (10 × 300 + 5 × 100) / 400
    expect(view[0].review?.score).toBe(8.75);
    expect(view[0].review?.name).toBe("Alex");

    expect(view[1]).toMatchObject({ rank: 2, album: null, review: null });
    const linked = decodePayload(view[1].reviewPath.slice("/r/".length));
    expect(linked).toMatchObject({ ok: true, payload: { s: "dz", a: "2", r: "g", n: "Alex" } });
  });
});
