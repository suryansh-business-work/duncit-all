import type { Control } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { BANNER_STYLES, BANNER_STYLE_LABEL, HOURS, SETTINGS_LIMITS } from '../copy';
import MultiPickField from './MultiPickField';
import SwitchField from './SwitchField';
import type { PromoSettingsFormValues, PromoSettingsOptions } from './promo-settings.types';

interface Props {
  control: Control<PromoSettingsFormValues>;
  options: PromoSettingsOptions;
  disabled: boolean;
  timeZone: string;
}

const pad = (hour: number) => String(hour).padStart(2, '0');

/** When the post goes out, where to, whether a manager signs it off, and what the banner looks like. */
export default function ScheduleFields({ control, options, disabled, timeZone }: Readonly<Props>) {
  const { t } = useTranslation();
  const { days_before, cta_text, utm_prefix } = SETTINGS_LIMITS;
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SwitchField control={control} name="enabled" label={t('marketing.podPromo.enabled')} help={t('marketing.podPromo.enabledHelp')} disabled={disabled} testId="promo-enabled" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SwitchField
          control={control}
          name="needs_approval"
          label={t('marketing.podPromo.needsApproval')}
          help={t('marketing.podPromo.needsApprovalHelp')}
          disabled={disabled}
          testId="promo-needs-approval"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <RhfTextField
          control={control}
          name="days_before"
          type="number"
          label={t('marketing.podPromo.daysBefore')}
          hint={t('marketing.podPromo.daysBeforeHint')}
          disabled={disabled}
          slotProps={{ htmlInput: { min: days_before.min, max: days_before.max, step: 1 } }}
          data-testid="promo-days-before"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <RhfTextField
          control={control}
          name="post_hour"
          select
          label={t('marketing.podPromo.postHour')}
          hint={t('marketing.podPromo.postHourHint', { vars: { zone: timeZone } })}
          disabled={disabled}
          data-testid="promo-post-hour"
        >
          {HOURS.map((hour) => (
            <MenuItem key={hour} value={hour}>
              {t('marketing.podPromo.hourOption', { vars: { hour: pad(hour) } })}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <RhfTextField control={control} name="banner_style" select label={t('marketing.podPromo.bannerStyle')} hint={t('marketing.podPromo.bannerStyleHint')} disabled={disabled} data-testid="promo-banner-style">
          {BANNER_STYLES.map((style) => (
            <MenuItem key={style} value={style}>
              {t(BANNER_STYLE_LABEL[style])}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={12}>
        <MultiPickField
          control={control}
          name="account_ids"
          label={t('marketing.podPromo.accounts')}
          hint={t('marketing.podPromo.accountsHint')}
          options={options.accounts}
          disabled={disabled}
          testId="promo-accounts"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField
          control={control}
          name="cta_text"
          label={t('marketing.podPromo.ctaText')}
          hint={t('marketing.podPromo.ctaTextHint', { vars: { max: cta_text.max } })}
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: cta_text.max } }}
          data-testid="promo-cta-text"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField
          control={control}
          name="utm_prefix"
          label={t('marketing.podPromo.utmPrefix')}
          hint={t('marketing.podPromo.utmPrefixHint')}
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: utm_prefix.max } }}
          data-testid="promo-utm-prefix"
        />
      </Grid>
    </Grid>
  );
}
