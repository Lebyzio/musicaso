import { z } from "zod";
import { RATINGS_PATTERN } from "./ratings";

export const NAME_MAX = 40;
export const TEXT_MAX = 280;

const Ratings = z.string().max(500).regex(RATINGS_PATTERN);

/**
 * Share payload v1 (AGENTS.md §5.1). Unknown keys are stripped, which also drops a nested
 * `ref.ref` — references are only ever one level deep.
 */
export const ReviewPayloadV1 = z.object({
  v: z.literal(1),
  s: z.enum(["dz", "it", "mb"]), // source
  a: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/), // album id
  k: z.number().int().nonnegative().max(500), // track count when reviewed
  r: Ratings,
  n: z.string().max(NAME_MAX).optional(), // reviewer name
  t: z.string().max(TEXT_MAX).optional(), // short review text
  f: z.number().int().nonnegative().optional(), // favourite track index
  w: z.literal(1).optional(), // album score weighted by track length
  th: z
    .string()
    .max(20)
    .regex(/^[a-z0-9-]+$/)
    .optional(), // card theme id
  ref: z.object({ n: z.string().max(NAME_MAX).optional(), r: Ratings }).optional(),
});

export type ReviewPayload = z.infer<typeof ReviewPayloadV1>;
