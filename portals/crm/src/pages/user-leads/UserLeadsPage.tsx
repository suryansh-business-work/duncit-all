import { Alert, Box, Stack, Typography } from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';

/**
 * User Leads — people imported from WhatsApp (via the WhatsApp Lead Generator).
 * Phase 1 scaffold: the list + filters + per-lead detail navigation land with the
 * WhatsApp Lead Generator data pipeline (server User-Lead module + Mongo cache).
 */
export default function UserLeadsPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <PersonSearchIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          User Leads
        </Typography>
      </Stack>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        User Leads are created automatically from numbers imported by the WhatsApp
        Lead Generator (Tools → WhatsApp Lead Generator). Connect a WhatsApp account
        and import communities, groups or users to populate this list.
      </Alert>
    </Box>
  );
}
