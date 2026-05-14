import { Box, Chip, Stack, Typography } from '@mui/material';
import type { InterviewFormValues } from '../interview.form';

interface Props {
  active: any;
  values: InterviewFormValues;
  fmtSlotLong: (slot: { start: string; end: string }) => string;
  setFieldValue: (field: string, value: any) => void;
}

export default function InterviewRequestSummary({ active, values, fmtSlotLong, setFieldValue }: Props) {
  return (
    <>
      <Box>
        <Typography variant="subtitle2">
          {active.applicant_name} · {active.type}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {active.applicant_email} · {active.applicant_phone}
        </Typography>
      </Box>
      {active.business_name && (
        <Typography variant="body2">
          <strong>Business:</strong> {active.business_name}
          {active.business_address ? ` - ${active.business_address}` : ''}
        </Typography>
      )}
      {(active.city || active.zone) && (
        <Typography variant="body2">
          <strong>Location:</strong> {[active.city, active.zone].filter(Boolean).join(' / ')}
        </Typography>
      )}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          About
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {active.about}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Preferred slots
        </Typography>
        <Stack spacing={0.5}>
          {active.preferred_slots.map((slot: any, slotIndex: number) => (
            <Chip
              key={slotIndex}
              label={fmtSlotLong(slot)}
              variant={values.pickedSlotIdx === slotIndex ? 'filled' : 'outlined'}
              color={values.pickedSlotIdx === slotIndex ? 'primary' : 'default'}
              onClick={() => {
                setFieldValue('pickedSlotIdx', slotIndex);
                setFieldValue('customStart', slot.start);
                setFieldValue('customEnd', slot.end);
              }}
              sx={{ justifyContent: 'flex-start' }}
            />
          ))}
        </Stack>
      </Box>
    </>
  );
}