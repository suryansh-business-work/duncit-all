import { Stack } from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import type { VenueSettings } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The booking rules, labelled from `availability.rules.*` — the same sentences
 * the owner set them with in the Partners console, so the two never drift. */
const numberRows = (rules: VenueSettings['rules'], t: Translate) => [
  { key: 'buffer', label: t('availability.rules.bufferMinutes'), value: rules.buffer_minutes },
  { key: 'notice', label: t('availability.rules.minNotice'), value: rules.min_notice_minutes },
  { key: 'advance', label: t('availability.rules.maxAdvance'), value: rules.max_advance_days },
  { key: 'perSlot', label: t('availability.rules.maxBookings'), value: rules.max_bookings_per_slot },
];

const flagRows = (rules: VenueSettings['rules'], t: Translate) => [
  { key: 'instant', label: t('availability.rules.allowInstant'), on: rules.allow_instant_booking },
  { key: 'waitlist', label: t('availability.rules.allowWaitlist'), on: rules.allow_waitlist },
  { key: 'approval', label: t('availability.rules.approvalRequired'), on: rules.booking_approval_required },
  { key: 'multiple', label: t('availability.rules.allowMultiple'), on: rules.allow_multiple_bookings },
];

export default function VenueRulesCard({ settings }: Readonly<{ settings: VenueSettings }>) {
  const { t } = useTranslation();
  const rules = settings.rules;
  const yes = t('shell.common.yes');
  const no = t('shell.common.no');

  return (
    <SectionCard icon={<RuleIcon color="primary" />} title={t('availability.rules.title')}>
      <Stack spacing={1}>
        {numberRows(rules, t).map((row) => (
          <InfoRow key={row.key} variant="split" label={row.label} value={row.value} />
        ))}
        {flagRows(rules, t).map((row) => (
          <InfoRow key={row.key} variant="split" label={row.label} value={row.on ? yes : no} />
        ))}
      </Stack>
    </SectionCard>
  );
}
