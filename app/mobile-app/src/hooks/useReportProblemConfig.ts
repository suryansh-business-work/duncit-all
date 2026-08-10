import { useEffect, useState } from 'react';
import { FEEDBACK_CATEGORIES } from '@duncit/slack';

import { ReportProblemConfigDocument } from '@/graphql/feedback';
import { graphqlRequest } from '@/services/graphql.client';

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

/**
 * What the form showed before any of this was configurable.
 *
 * Used until the server answers, and kept as the fallback when it cannot be
 * reached — a reporter with no signal must still be able to file the problem
 * they are trying to report, which is exactly when they are most likely to be
 * reporting one.
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
 * its fallback. */
export function useReportProblemConfig() {
  const [config, setConfig] = useState<ReportProblemFormConfig>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    graphqlRequest(ReportProblemConfigDocument, undefined, { auth: true })
      .then((data) => {
        if (cancelled) return;
        const remote = (data as any)?.reportProblemConfig;
        const active = (remote?.categories ?? []).filter((c: any) => c?.is_active);
        if (active.length === 0) return;
        setConfig({
          categories: active.map((c: any) => ({ key: c.key, label: c.label })),
          message_label: remote.message_label || FALLBACK.message_label,
          message_hint: remote.message_hint || FALLBACK.message_hint,
          message_min_length: remote.message_min_length || FALLBACK.message_min_length,
          allow_media: remote.allow_media !== false,
          max_media: remote.max_media || FALLBACK.max_media,
        });
      })
      .catch(() => {
        // Keep the fallback — see the note above.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}
