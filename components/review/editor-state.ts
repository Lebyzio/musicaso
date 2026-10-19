import { type CardTheme, isCardTheme } from "@/lib/card/themes";
import { clampHalfSteps, type Rating } from "@/lib/score";
import { fitRatings } from "@/lib/share/ratings";
import { NAME_MAX, TEXT_MAX } from "@/lib/share/schema";

export interface EditorState {
  ratings: Rating[];
  /** Index of the track that has keyboard focus / the quick-pick strip. */
  active: number;
  weighted: boolean;
  /** Reviewer name and short review text, shared in the link. */
  name: string;
  text: string;
  /** Card theme, carried in the share link so viewers get the same default card. */
  theme: CardTheme;
  /** The saved draft has been read (autosave must not run before that). */
  loaded: boolean;
  /** The draft was saved against a different tracklist. */
  mismatch: boolean;
}

export type EditorAction =
  | { type: "set"; index: number; value: number }
  | { type: "nudge"; index: number; delta: number }
  | { type: "toggleSkip"; index: number }
  | { type: "clear"; index: number }
  | { type: "clearAll" }
  | { type: "focus"; index: number }
  | { type: "move"; delta: number }
  | { type: "toggleWeighted" }
  | { type: "setName"; value: string }
  | { type: "setText"; value: string }
  | { type: "setTheme"; value: CardTheme }
  | {
      type: "hydrate";
      ratings: readonly Rating[];
      weighted: boolean;
      mismatch: boolean;
      name?: string;
      text?: string;
      theme?: string;
    }
  | { type: "dismissMismatch" };

/** Unrated tracks start nudging from the middle of the scale. */
const NUDGE_FROM = 10;

export function initEditor(trackCount: number): EditorState {
  return {
    ratings: Array<Rating>(trackCount).fill(null),
    active: 0,
    weighted: false,
    name: "",
    text: "",
    theme: "sleeve",
    loaded: false,
    mismatch: false,
  };
}

function withRating(state: EditorState, index: number, rating: Rating): EditorState {
  if (index < 0 || index >= state.ratings.length || state.ratings[index] === rating) return state;
  const ratings = state.ratings.slice();
  ratings[index] = rating;
  return { ...state, ratings };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const last = state.ratings.length - 1;
  switch (action.type) {
    case "set":
      return withRating(state, action.index, clampHalfSteps(action.value));
    case "nudge": {
      const current = state.ratings[action.index];
      const base = typeof current === "number" ? current : NUDGE_FROM;
      return withRating(state, action.index, clampHalfSteps(base + action.delta));
    }
    case "toggleSkip":
      return withRating(
        state,
        action.index,
        state.ratings[action.index] === "skip" ? null : "skip",
      );
    case "clear":
      return withRating(state, action.index, null);
    case "clearAll":
      return { ...state, ratings: initEditor(state.ratings.length).ratings, active: 0 };
    case "focus":
      return action.index === state.active || action.index < 0 || action.index > last
        ? state
        : { ...state, active: action.index };
    case "move": {
      const active = Math.min(last, Math.max(0, state.active + action.delta));
      return active === state.active ? state : { ...state, active };
    }
    case "toggleWeighted":
      return { ...state, weighted: !state.weighted };
    case "hydrate":
      return {
        ...state,
        ratings: fitRatings(action.ratings, state.ratings.length),
        weighted: action.weighted,
        name: (action.name ?? "").slice(0, NAME_MAX),
        text: (action.text ?? "").slice(0, TEXT_MAX),
        theme: isCardTheme(action.theme) ? action.theme : state.theme,
        loaded: true,
        mismatch: action.mismatch,
      };
    case "setName":
      return { ...state, name: action.value.slice(0, NAME_MAX) };
    case "setText":
      return { ...state, text: action.value.slice(0, TEXT_MAX) };
    case "setTheme":
      return state.theme === action.value ? state : { ...state, theme: action.value };
    case "dismissMismatch":
      return state.mismatch ? { ...state, mismatch: false } : state;
  }
}
