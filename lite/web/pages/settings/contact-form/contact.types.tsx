import { z } from 'zod';
import type { LiteContactKind } from '../../../graphql/profile';
import { rules, type Translate } from '../../../lib/validation';

/**
 * Step one: the new email or phone (the right rule for the kind). A phone may
 * be typed with or without its country code — the API adds the default one.
 */
export const makeContactValueSchema = (t: Translate, kind: LiteContactKind) => z.object({ value: kind === 'EMAIL' ? rules.email(t) : rules.phone(t) });

/** Step two: the code that was sent to it. */
export const makeContactCodeSchema = (t: Translate) => z.object({ code: rules.code(t) });

export type ContactValueValues = z.infer<ReturnType<typeof makeContactValueSchema>>;
export type ContactCodeValues = z.infer<ReturnType<typeof makeContactCodeSchema>>;
