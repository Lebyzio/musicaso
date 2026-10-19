import { describe, expect, it } from "vitest";
import { isSameName, nameKey } from "@/lib/music/match";

describe("nameKey", () => {
  it("ignores case, punctuation, accents and a leading 'The'", () => {
    expect(nameKey("The Doobie Brothers")).toBe("doobiebrothers");
    expect(nameKey("doobie brothers!")).toBe("doobiebrothers");
    expect(nameKey("Beyoncé")).toBe("beyonce");
    expect(nameKey("Earth, Wind & Fire")).toBe("earthwindandfire");
  });

  it("keeps Thai text, including tone marks", () => {
    expect(nameKey("บอดี้สแลม")).toBe(nameKey("บอดี้ สแลม"));
    expect(nameKey("ปู่")).not.toBe(nameKey("ปู"));
  });
});

describe("isSameName", () => {
  it("matches the same artist written differently", () => {
    expect(isSameName("christopher cross", "Christopher Cross")).toBe(true);
    expect(isSameName("Doobie Brothers", "The Doobie Brothers")).toBe(true);
  });

  it("does not match partial names or empty queries", () => {
    expect(isSameName("christopher", "Christopher Cross")).toBe(false);
    expect(isSameName("Christopher Cross Sailing", "Christopher Cross")).toBe(false);
    expect(isSameName("!!", "!!")).toBe(false);
  });
});
