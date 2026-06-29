import { Box, Chip, Stack, Typography } from '@mui/material';
import type { VenueStep1, VenueStep2, VenueStep3 } from './types';

interface Props {
  step1: VenueStep1;
  step2: VenueStep2;
  step3: VenueStep3;
  status?: string;
}

type ChipColor = 'warning' | 'info' | 'success' | 'error';

// The review card mirrors the real venue status so it never contradicts the
// header (e.g. an APPROVED venue must not show a "Draft" pill).
const STATUS_CHIP: Record<string, { label: string; color: ChipColor }> = {
  DRAFT: { label: 'Draft', color: 'warning' },
  SUBMITTED: { label: 'Submitted', color: 'info' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
};

const STATUS_BLURB: Record<string, string> = {
  DRAFT: 'Our team verifies your space within 24 hours.',
  SUBMITTED: 'Submitted — our team verifies your space within 24 hours.',
  APPROVED: 'Approved — your venue is live and visible to hosts.',
  REJECTED: 'Rejected — update the details and resubmit for review.',
};

export default function SubmitStep({ step1, step2, step3, status = 'DRAFT' }: Readonly<Props>) {
  const chip = STATUS_CHIP[status] ?? STATUS_CHIP.DRAFT;
  const blurb = STATUS_BLURB[status] ?? STATUS_BLURB.DRAFT;
  return (
    <Stack spacing={2}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,79,115,0.10)', border: '1px solid rgba(255,79,115,0.18)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>Review & submit</Typography>
        <Typography variant="caption" color="text.secondary">
          {blurb}
        </Typography>
      </Box>
      <Box sx={{ overflow: 'hidden', borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ width: '100%', aspectRatio: '16 / 9', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box component="img" src={step1.cover_image_url || '/duncit-logo.svg'} alt={step1.venue_name || 'Venue'} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
        </Box>
        <Stack spacing={1} sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 950 }} noWrap>{step1.venue_name || 'Venue name'}</Typography>
            <Chip size="small" label={chip.label} color={chip.color} sx={{ fontWeight: 900 }} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {step1.venue_type} - Capacity {step1.capacity || 0}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            {[step1.address_line1, step1.locality, step1.city, step1.state].filter(Boolean).join(', ') || 'Address pending'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {step2.documents.filter((doc) => doc.url).length} documents uploaded - Owner: {step3.owner_name || 'Pending'}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}