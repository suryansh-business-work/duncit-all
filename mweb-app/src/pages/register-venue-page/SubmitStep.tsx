import { Box, Stack, Typography } from '@mui/material';
import type { VenueStep1, VenueStep2, VenueStep3 } from './types';

interface Props {
  step1: VenueStep1;
  step2: VenueStep2;
  step3: VenueStep3;
}

export default function SubmitStep({ step1, step2, step3 }: Props) {
  return (
    <Stack spacing={2}>
      <Typography variant="body1">Review and submit your venue application.</Typography>
      <Box>
        <Typography variant="subtitle2">{step1.venue_name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {step1.venue_type} - cap {step1.capacity} - {[step1.locality, step1.city, step1.state].filter(Boolean).join(', ')}
        </Typography>
      </Box>
      <Typography variant="caption">
        {step2.documents.filter((doc) => doc.url).length} documents - Owner: {step3.owner_name}
      </Typography>
    </Stack>
  );
}