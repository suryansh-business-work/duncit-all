import { Box, Paper, Stack, Typography } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SecurityIcon from '@mui/icons-material/Security';
import SupportShell from './SupportShell';
import SupportSectionCard from './SupportSectionCard';
import { SUPPORT_SECTIONS } from './sections';

export default function SupportHubPage() {
  return (
    <SupportShell
      title="Support"
      subtitle="Help, safety and live feedback in one place"
      icon={<SupportAgentIcon fontSize="small" />}
      backTo="/"
    >
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(255,79,115,0.08)' }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <SecurityIcon color="primary" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                Your help crew, one tap away
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pick what you need — SOS, callbacks and live feedback are scoped to your pod.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          {SUPPORT_SECTIONS.map((section) => (
            <SupportSectionCard key={section.key} section={section} />
          ))}
        </Box>
      </Stack>
    </SupportShell>
  );
}
