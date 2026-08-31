import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { FEEDBACK_CATEGORIES, REPORT_PROBLEM_CONFIG_SDL } from '@duncit/slack';

export interface ReportProblemCategoryOption {
  key: string;
  label: string;
}

export interface ReportProblemFormConfig {
  categories: ReportProblemCategoryOption[];
  message_label: string;
  message_hint: string;
  message_min_length: number;
  allow_media: boolean;
  max_media: number;
}

export const REPORT_PROBLEM_CONFIG = gql(REPORT_PROBLEM_CONFIG_SDL);

/**
 * What the form showed before any of this was configurable.
 *
 * Used until the server answers, and kept as the fallback when it cannot be
 * reached — someone with a broken connection is exactly the person most likely
 * to be reporting a problem, so the form must still work for them.
 */
const FALLBACK: ReportProblemFormConfig = {
  categories: FEEDBACK_CATEGORIES.map((label) => ({ key: label.toUpperCase(), label })),
  message_label: "What's going on?",
  message_hint: 'At least 10 characters.',
  message_min_length: 10,
  allow_media: true,
  max_media: 5,
};

/** The admin-configured Report a Problem form, with the old hardcoded form as
 * its fallback. Twin of the native hook of the same name (rule 27). */
export function useReportProblemConfig(): {
  config: ReportProblemFormConfig;
  loading: boolean;
} {
  const { data, loading } = useQuery<any>(REPORT_PROBLEM_CONFIG, { fetchPolicy: 'cache-and-network' });

  const remote = data?.reportProblemConfig;
  const active = (remote?.categories ?? []).filter((c: any) => c?.is_active);
  if (!remote || active.length === 0) return { config: FALLBACK, loading };

  return {
    loading,
    config: {
      categories: active.map((c: any) => ({ key: c.key, label: c.label })),
      message_label: remote.message_label || FALLBACK.message_label,
      message_hint: remote.message_hint || FALLBACK.message_hint,
      message_min_length: remote.message_min_length || FALLBACK.message_min_length,
      allow_media: remote.allow_media !== false,
      max_media: remote.max_media || FALLBACK.max_media,
    } satisfies ReportProblemFormConfig,
  };
}
