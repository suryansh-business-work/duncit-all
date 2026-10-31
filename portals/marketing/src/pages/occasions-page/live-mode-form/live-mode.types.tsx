import { z } from 'zod';
import type { OccasionLiveMode, OccasionSettings, OccasionTheme } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { LIVE_MODES } from '../copy';

export interface LiveModeFormValues {
  mode: OccasionLiveMode;
  /** The look to pin; only read while `mode` is MANUAL. */
  manual_key: string;
}

export const liveModeValues = (settings: OccasionSettings): LiveModeFormValues => ({
  mode: settings.mode,
  manual_key: settings.manual_key,
});

/** Pinning needs a look; the other two modes need nothing else. */
export const liveModeSchema = (t: Translate) =>
  z
    .object({ mode: z.enum(LIVE_MODES), manual_key: z.string().trim() })
    .superRefine((values, ctx) => {
      if (values.mode === 'MANUAL' && !values.manual_key) {
        ctx.addIssue({ code: 'custom', path: ['manual_key'], message: t('marketing.occasions.live.pickLookRequired') });
      }
    });

export interface LiveModeFormProps {
  settings: OccasionSettings;
  /** The looks that can be pinned: every one not archived. */
  looks: readonly Pick<OccasionTheme, 'key' | 'name'>[];
  onSubmit: (values: LiveModeFormValues) => Promise<boolean>;
}
