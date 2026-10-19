import { clampHalfSteps, type Rating } from "@/lib/score";
import { fitRatings } from "@/lib/share/ratings";

export interface EditorState {
  ratings: Rating[];
  /** Index of the track that has keyboard focus / the quick-pick strip. */
  active: number;
  weighted: boolean;
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
  | { type: "hydrate"; ratings: readonly Rating[]; weighted: boolean; mismatch: boolean }
  | { type: "dismissMismatch" };

/** Unrated tracks start nudging from the middle of the scale. */
const NUDGE_FROM = 10;

export function initEditor(trackCount: number): EditorState {
  return {
    ratings: Array<Rating>(trackCount).fill(null),
    active: 0,
    weighted: false,
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
        loaded: true,
        mismatch: action.mismatch,
      };
    case "dismissMismatch":
      return state.mismatch ? { ...state, mismatch: false } : state;
  }
}
