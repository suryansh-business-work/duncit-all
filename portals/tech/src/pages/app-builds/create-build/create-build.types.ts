import { z } from 'zod';
import type { AppBuildArtifactKind, AppBuildEnv, AppBuildPlatform } from '../queries';

/**
 * A git ref: a branch or tag name. Deliberately permissive about what a name
 * may contain and strict about what git itself forbids — a leading/trailing
 * slash or dot, `..`, whitespace, and the characters git reserves for refspecs.
 */
const REF_RE = /^(?!\/|\.)(?!.*\.\.)[\w./-]+(?<![/.])$/;

export interface CreateBuildMessages {
  refFormat: string;
  artifactsRequired: string;
  playStoreRequiresAab: string;
  playStoreRequiresProduction: string;
}

export const createBuildSchema = (messages: CreateBuildMessages) =>
  z.object({
    app_env: z.enum(['PRODUCTION', 'STAGING']),
    // iOS has one artifact and the field is not rendered, so the default has to
    // be valid on its own — an empty list is a real error, not a placeholder.
    artifacts: z
      .array(z.enum(['APK', 'AAB', 'IPA']))
      .min(1, messages.artifactsRequired),
    submit_to_play_store: z.boolean(),
    ref: z.string().trim().regex(REF_RE, messages.refFormat),
  }).superRefine((values, ctx) => {
    if (!values.submit_to_play_store) return;
    if (!values.artifacts.includes('AAB')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['artifacts'],
        message: messages.playStoreRequiresAab,
      });
    }
    if (values.app_env !== 'PRODUCTION') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['app_env'],
        message: messages.playStoreRequiresProduction,
      });
    }
  });

export type CreateBuildValues = z.infer<ReturnType<typeof createBuildSchema>>;

/** What each platform can produce. iOS has exactly one answer. */
export const PLATFORM_ARTIFACTS: Record<AppBuildPlatform, AppBuildArtifactKind[]> = {
  ANDROID: ['APK', 'AAB'],
  IOS: ['IPA'],
};

/**
 * The branch an env builds from by default — the same mapping the deploy
 * workflow uses, so a staging build is made from the code running on staging.
 * The server applies this too; sending it explicitly keeps the field showing
 * what will actually be built rather than leaving the operator to guess.
 */
export const defaultRefFor = (
  env: AppBuildEnv,
  config: { production_ref: string; staging_ref: string }
): string => (env === 'STAGING' ? config.staging_ref : config.production_ref);
