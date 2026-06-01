import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import type { EnvEntry } from '../queries';
import GoogleMapsTest from './GoogleMapsTest';
import GoogleOAuthTab from './GoogleOAuthTab';

/**
 * Google tests live under two separate tabs — Maps and OAuth — each with its
 * own independent test surface.
 */
export default function GoogleTestPanel({ entry }: { entry: EnvEntry }) {
  const [tab, setTab] = useState<'maps' | 'oauth'>('maps');
  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="maps" label="Google Map" />
        <Tab value="oauth" label="Google OAuth" />
      </Tabs>
      {tab === 'maps' ? <GoogleMapsTest /> : <GoogleOAuthTab entry={entry} />}
    </Box>
  );
}
