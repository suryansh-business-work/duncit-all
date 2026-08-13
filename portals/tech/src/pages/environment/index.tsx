import { Box, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import EnvVariablesTab from './EnvVariablesTab';
import PortalMappingTab from './PortalMappingTab';

type Section = 'variables' | 'mapping';
const SECTIONS: DuncitTabItem<Section>[] = [
  { value: 'variables', label: 'Variables' },
  { value: 'mapping', label: 'Portal Mapping' },
];

export default function EnvironmentPage() {
  const tabs = useTabParam<Section>({ items: SECTIONS, fallback: 'variables' });

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Environment Variables</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage credential entries per category, then map which entries each portal uses.
          </Typography>
        </Box>
      </Stack>

      <DuncitTabs {...tabs} />

      {tabs.value === 'variables' ? <EnvVariablesTab /> : <PortalMappingTab />}
    </Stack>
  );
}
