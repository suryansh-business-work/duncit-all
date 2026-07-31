import type { ReactNode } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import type { HostRow } from '../queries';

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
  const at = (value?: string | null) => (value ? formatDateTime(value) : '—');
  const bank = host.bank_account;

  return (
    <Stack spacing={1.5}>
      <Section title="Application">
        <InfoRow variant="inline" labelWidth={120} label="Host ID" value={dash(host.host_no)} />
        <InfoRow variant="inline" labelWidth={120} label="User ID" value={host.user_id} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label="Onboarding"
          value={`Step ${host.step_completed ?? 0} of 4`}
        />
        <InfoRow variant="inline" labelWidth={120} label="Started" value={at(host.created_at)} />
        <InfoRow variant="inline" labelWidth={120} label="Submitted" value={at(host.submitted_at)} />
      </Section>

      <Section title="Contact">
        <InfoRow variant="inline" labelWidth={120} label="Email" value={dash(host.email)} />
        <InfoRow variant="inline" labelWidth={120} label="Phone" value={dash(host.phone)} />
      </Section>

      <Section title="Identity">
        <InfoRow variant="inline" labelWidth={120} label="Date of birth" value={at(host.dob)} />
        <InfoRow variant="inline" labelWidth={120} label="Aadhar" value={dash(host.aadhar_number)} />
        <InfoRow variant="inline" labelWidth={120} label="PAN" value={dash(host.pan_number)} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label="Address"
          value={dash(host.full_address)}
          sx={FULL_WIDTH}
        />
      </Section>

      <Section title="Payout">
        <InfoRow variant="inline" labelWidth={120} label="Method" value={dash(bank?.payout_method)} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label="Account holder"
          value={dash(bank?.account_holder_name)}
        />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label="Account no."
          value={maskAccount(bank?.account_number)}
        />
        <InfoRow variant="inline" labelWidth={120} label="IFSC" value={dash(bank?.ifsc_code)} />
        <InfoRow variant="inline" labelWidth={120} label="UPI" value={dash(bank?.upi_id)} />
      </Section>

      <Section title="Review history">
        <InfoRow variant="inline" labelWidth={120} label="Approved" value={at(host.approved_at)} />
        <InfoRow variant="inline" labelWidth={120} label="Rejected" value={at(host.rejected_at)} />
        <InfoRow variant="inline" labelWidth={120} label="Last updated" value={at(host.updated_at)} />
        <InfoRow
          variant="inline"
          labelWidth={120}
          label="Last note"
          value={dash(host.reviewer_notes)}
          sx={FULL_WIDTH}
        />
      </Section>
    </Stack>
  );
}
