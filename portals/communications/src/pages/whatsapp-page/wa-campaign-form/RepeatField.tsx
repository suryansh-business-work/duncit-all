import type { Control } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { WaCampaignValues } from './wa-campaign.types';
import { useTranslation } from '@duncit/app-settings';

/**
 * Turn a send to an audience list into a recurring journey: it runs again every
 * N days against whoever fits the list THEN, and never messages the same person
 * twice. Only offered for a list — every other audience is the same people each
 * time, which is a repeat broadcast, not a journey.
 */
export default function RepeatField({
  control,
  audience,
}: Readonly<{ control: Control<WaCampaignValues>; audience: string }>) {
  const { t } = useTranslation();
  if (audience !== 'AUDIENCE_LIST') return null;
  return (
    <RhfTextField
      control={control}
      name="repeat_every_days"
      label={t('marketing.whatsappCampaigns.repeatEveryDays')}
      hint={t('marketing.whatsappCampaigns.repeatEveryDaysHint')}
    />
  );
}
