import { z } from 'zod';

/**
 * Validation messages are injected rather than written here so every user-facing
 * string stays a literal `t('…')` call in the component (CLAUDE.md rule 38).
 */
export interface ConnectionMessages {
  uriRequired: string;
  uriFormat: string;
  databaseRequired: string;
}

export interface DataCloneConnectionValues {
  uri: string;
  database: string;
}

/** The only two schemes the MongoDB driver accepts. */
const URI_PATTERN = /^mongodb(\+srv)?:\/\/\S+$/;

/**
 * `hasUri` is true once a string is saved for this end: the field is then
 * optional, because a blank one keeps the stored credentials (which are only
 * ever shown masked) and lets the database name be corrected on its own.
 */
export const dataCloneConnectionSchema = (hasUri: boolean, messages: ConnectionMessages) =>
  z.object({
    uri: z
      .string()
      .trim()
      .superRefine((value, ctx) => {
        if (!value) {
          if (!hasUri) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.uriRequired });
          }
          return;
        }
        if (!URI_PATTERN.test(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.uriFormat });
        }
      }),
    database: z.string().trim().min(1, messages.databaseRequired),
  });
