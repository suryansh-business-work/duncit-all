import type { ReactNode } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import type { CrmAppBuild } from '../../api/appDownload.gql';
import AppBuildCard from './AppBuildCard';

interface Props {
  /** The heading's id, which names the section for screen readers. */
  id: string;
  icon: ReactNode;
  /** The platform, e.g. Android or iPhone. */
  title: string;
  production: CrmAppBuild | null;
  /** Shown beside production only once a staging build exists. */
  staging: CrmAppBuild | null;
  installTitle: string;
  steps: readonly string[];
  /** What works differently on this platform, when something does. */
  note?: string;
}

/** One platform on the Download CRM App page: its newest builds, then how to install them. */
export default function PlatformSection({
  id,
  icon,
  title,
  production,
  staging,
  installTitle,
  steps,
  note,
}: Readonly<Props>) {
  return (
    <Box component="section" aria-labelledby={id}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        {icon}
        <Typography id={id} component="h2" variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ '& > *': { flex: 1 } }}>
        <AppBuildCard env="PRODUCTION" build={production} />
        {staging && <AppBuildCard env="STAGING" build={staging} />}
      </Stack>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
        {installTitle}
      </Typography>
      <Box component="ol" sx={{ pl: 3, m: 0 }}>
        {steps.map((step) => (
          <Typography component="li" variant="body2" key={step} sx={{ mb: 0.5 }}>
            {step}
          </Typography>
        ))}
      </Box>
      {note && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {note}
        </Alert>
      )}
    </Box>
  );
}
