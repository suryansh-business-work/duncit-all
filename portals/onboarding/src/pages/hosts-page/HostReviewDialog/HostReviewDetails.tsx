import type { ReactNode } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import type { HostRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  host: HostRow;
  formatDateTime: (value: string) => string;
}

const dash = (value?: string | null) => value || '—';

/** Free-text rows keep the whole row rather than wrapping inside half of it. */
const FULL_WIDTH = { gridColumn: { sm: '1 / -1' } };

/** Payout accounts are shown last-4 only: a reviewer confirms the destination
 * exists, they never need the full number read back to them. */
const maskAccount = (value?: string | null) =>
  value ? `•••• ${value.slice(-4)}` : '—';

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <>
      <Divider textAlign="left">
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {title}
        </Typography>
      </Divider>
      {/* Two columns once there is room: these rows are short, and a single
          column down a dialog this wide is a lot of scrolling for a reviewer. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          columnGap: 3,
          rowGap: 0.75,
        }}
      >
        {children}
      </Box>
    </>
  );
}

/**
 * Everything the host and their application already carry — identity, contact,
 * KYC, payout destination and the review timeline. All of it rides in on the
 * table row the dialog was opened with, so rendering it costs no extra query;
 * it just used to be thrown away.
 */
export default function HostReviewDetails({ host, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const at = (value?: string | null) => (value ? formatDateTime(value) : '—');
  const bank = host.bank_account;

  return (
    <Stack spacing={1.5}>
      <Section title={t('onboarding.hosts.application')}>
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.hostId')} value={dash(host.host_no)} />
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.userId')} value={host.user_id} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label={t('shell.nav.onboarding')}
          value={`Step ${host.step_completed ?? 0} of 4`}
        />
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.common.started')} value={at(host.created_at)} />
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.common.submitted')} value={at(host.submitted_at)} />
      </Section>

      <Section title={t('onboarding.common.contact')}>
        <InfoRow variant="inline" labelWidth={120} label={t('shell.common.email')} value={dash(host.email)} />
        <InfoRow variant="inline" labelWidth={120} label={t('shell.common.phone')} value={dash(host.phone)} />
      </Section>

      <Section title={t('onboarding.common.identity')}>
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.dateOfBirth')} value={at(host.dob)} />
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.aadhar')} value={dash(host.aadhar_number)} />
        <InfoRow variant="inline" labelWidth={120} label="PAN" value={dash(host.pan_number)} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label={t('onboarding.common.address')}
          value={dash(host.full_address)}
          sx={FULL_WIDTH}
        />
      </Section>

      <Section title={t('onboarding.common.payout')}>
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.method')} value={dash(bank?.payout_method)} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label={t('onboarding.hosts.accountHolder')}
          value={dash(bank?.account_holder_name)}
        />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label={t('onboarding.hosts.accountNo')}
          value={maskAccount(bank?.account_number)}
        />
        <InfoRow variant="inline" labelWidth={120} label="IFSC" value={dash(bank?.ifsc_code)} />
        <InfoRow variant="inline" labelWidth={120} label="UPI" value={dash(bank?.upi_id)} />
      </Section>

      <Section title={t('onboarding.hosts.reviewHistory')}>
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.approved')} value={at(host.approved_at)} />
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.common.rejected')} value={at(host.rejected_at)} />
        <InfoRow variant="inline" labelWidth={120} label={t('onboarding.hosts.lastUpdated')} value={at(host.updated_at)} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label={t('onboarding.hosts.lastNote')}
          value={dash(host.reviewer_notes)}
          sx={FULL_WIDTH}
        />
      </Section>
    </Stack>
  );
}
