import { describe, expect, it } from "vitest";
import { editorReducer, type EditorState, initEditor } from "@/components/review/editor-state";

const start = (ratings: EditorState["ratings"], active = 0): EditorState => ({
  ratings,
  active,
  weighted: false,
  name: "",
  text: "",
  loaded: true,
  mismatch: false,
});

describe("editorReducer", () => {
  it("starts with every track unrated", () => {
    expect(initEditor(3)).toEqual({
      ratings: [null, null, null],
      active: 0,
      weighted: false,
      name: "",
      text: "",
      loaded: false,
      mismatch: false,
    });
  });

  it("sets and clamps half-step values", () => {
    let s = editorReducer(initEditor(2), { type: "set", index: 0, value: 15 });
    expect(s.ratings).toEqual([15, null]);
    s = editorReducer(s, { type: "set", index: 1, value: 99 });
    expect(s.ratings[1]).toBe(20);
  });

  it("setting a skipped track un-skips it", () => {
    expect(editorReducer(start(["skip"]), { type: "set", index: 0, value: 8 }).ratings).toEqual([
      8,
    ]);
  });

  it("nudges within 0–20, starting unrated tracks from 5.0", () => {
    expect(editorReducer(start([null]), { type: "nudge", index: 0, delta: 1 }).ratings).toEqual([
      11,
    ]);
    expect(editorReducer(start([20]), { type: "nudge", index: 0, delta: 1 }).ratings).toEqual([20]);
    expect(editorReducer(start([0]), { type: "nudge", index: 0, delta: -1 }).ratings).toEqual([0]);
  });

  it("toggles skip on and off", () => {
    const skipped = editorReducer(start([14]), { type: "toggleSkip", index: 0 });
    expect(skipped.ratings).toEqual(["skip"]);
    expect(editorReducer(skipped, { type: "toggleSkip", index: 0 }).ratings).toEqual([null]);
  });

  it("clears one track or all of them, keeping the weighting option", () => {
    const s = { ...start([14, "skip", 3]), weighted: true };
    expect(editorReducer(s, { type: "clear", index: 0 }).ratings).toEqual([null, "skip", 3]);
    expect(editorReducer(s, { type: "clearAll" })).toMatchObject({
      ratings: [null, null, null],
      active: 0,
      weighted: true,
    });
  });

  it("moves the active track without leaving the list", () => {
    const s = start([null, null, null], 1);
    expect(editorReducer(s, { type: "move", delta: 1 }).active).toBe(2);
    expect(editorReducer(start([null, null], 1), { type: "move", delta: 1 }).active).toBe(1);
    expect(editorReducer(start([null, null], 0), { type: "move", delta: -1 }).active).toBe(0);
    expect(editorReducer(s, { type: "focus", index: 7 }).active).toBe(1);
  });

  it("returns the same object for no-op actions (cheap re-renders)", () => {
    const s = start([14, null]);
    expect(editorReducer(s, { type: "set", index: 0, value: 14 })).toBe(s);
    expect(editorReducer(s, { type: "set", index: 5, value: 14 })).toBe(s);
    expect(editorReducer(s, { type: "focus", index: 0 })).toBe(s);
  });

  it("edits name and text within the share limits", () => {
    let s = editorReducer(initEditor(1), { type: "setName", value: "x".repeat(50) });
    expect(s.name).toHaveLength(40);
    s = editorReducer(s, { type: "setText", value: "y".repeat(300) });
    expect(s.text).toHaveLength(280);
    const hydrated = editorReducer(initEditor(1), {
      type: "hydrate",
      ratings: [],
      weighted: false,
      mismatch: false,
      name: "Alex",
      text: "Great",
    });
    expect(hydrated).toMatchObject({ name: "Alex", text: "Great" });
  });

  it("hydrates a draft, fitting it to the tracklist", () => {
    const s = editorReducer(initEditor(3), {
      type: "hydrate",
      ratings: [20, "skip"],
      weighted: true,
      mismatch: true,
    });
    expect(s).toMatchObject({
      ratings: [20, "skip", null],
      weighted: true,
      loaded: true,
      mismatch: true,
    });
    expect(editorReducer(s, { type: "dismissMismatch" }).mismatch).toBe(false);
    expect(
      editorReducer(initEditor(1), {
        type: "hydrate",
        ratings: [1, 2, 3],
        weighted: false,
        mismatch: false,
      }).ratings,
    ).toEqual([1]);
  });
});
