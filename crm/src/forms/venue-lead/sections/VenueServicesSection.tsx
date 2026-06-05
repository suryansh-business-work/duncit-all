import { Stack, Typography } from '@mui/material';
import ServicesOfferedPicker from '../../fields/ServicesOfferedPicker';

export default function VenueServicesSection() {
  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
        FROM CATALOGUE · auto-loaded from the Super/Category/Sub you picked
      </Typography>
      <ServicesOfferedPicker appliesTo="VENUE" />
    </Stack>
  );
}
