import { describe, expect, it } from "vitest";
import { cardFilename, slugPart } from "@/lib/card/filename";

describe("card filenames", () => {
  it("builds a readable name", () => {
    expect(cardFilename({ artist: "Radiohead", title: "In Rainbows" }, "story")).toBe(
      "musicaso-radiohead-in-rainbows-story.png",
    );
  });

  it("keeps Thai letters, vowels and tone marks", () => {
    expect(cardFilename({ artist: "Bodyslam", title: "คราม" }, "square")).toBe(
      "musicaso-bodyslam-คราม-square.png",
    );
    expect(slugPart("ที่นี่ ญี่ปุ่น")).toBe("ที่นี่-ญี่ปุ่น");
  });

  it("strips characters operating systems reject", () => {
    expect(slugPart(`AC/DC: "Back" <In> Black?*|`)).toBe("ac-dc-back-in-black");
    expect(slugPart("Sgt. Pepper's Lonely Hearts")).toBe("sgt-peppers-lonely-hearts");
  });

  it("caps long parts and skips empty ones", () => {
    expect([...slugPart("a".repeat(100))]).toHaveLength(40);
    expect(cardFilename({ artist: "???", title: "!!!" }, "square")).toBe("musicaso-square.png");
  });
});
