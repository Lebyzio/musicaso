import { z } from "zod";
import { LIST_MAX, LIST_TITLE_MAX, NAME_MAX } from "./limits";
import { ReviewPayloadV1 } from "./schema";

/**
 * Top list payload v1 (`/l/{payload}`). Each item is a whole review minus the per-review extras
 * (name, text, theme, reference), so every entry can open as its own /r link.
 */
export const ListItemV1 = ReviewPayloadV1.pick({ s: true, a: true, k: true, r: true, w: true });

export const ListPayloadV1 = z.object({
  v: z.literal(1),
  n: z.string().max(NAME_MAX).optional(), // list author
  t: z.string().max(LIST_TITLE_MAX).optional(), // list title
  l: ReviewPayloadV1.shape.l, // language of the card / OG image
  i: z.array(ListItemV1).min(1).max(LIST_MAX), // ranked: first is #1
});

export type ListPayload = z.infer<typeof ListPayloadV1>;
export type ListItem = z.infer<typeof ListItemV1>;
