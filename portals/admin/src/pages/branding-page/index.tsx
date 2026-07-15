import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IdentitySection from './IdentitySection';
import PlatformAssetsSection from './PlatformAssetsSection';
import WebsiteAssetsSection from './WebsiteAssetsSection';
import { PLATFORM_SECTIONS } from './sizeGuides';
import { BRANDING, UPDATE_BRANDING, emptyBrandingForm, type BrandingFormState } from './queries';

interface SectionProps {
  title: string;
  subtitle: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function BrandingAccordion({ title, subtitle, defaultExpanded, children }: Readonly<SectionProps>) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function BrandingPage() {
  const { data, loading, error } = useQuery(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation(UPDATE_BRANDING, { refetchQueries: ['Branding'] });

  const [form, setForm] = useState<BrandingFormState>(emptyBrandingForm);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.branding) {
      const b = data.branding;
      const next = { ...emptyBrandingForm };
      (Object.keys(next) as (keyof BrandingFormState)[]).forEach((key) => {
        next[key] = b[key] ?? emptyBrandingForm[key];
      });
      setForm(next);
    }
  }, [data]);

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await updateMut({ variables: { input: form } });
      setToast('Branding saved');
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <BrandingWatermarkIcon color="primary" />
        <Box>
          <Typography variant="h5">Branding</Typography>
          <Typography variant="body2" color="text.secondary">
            Identity, per-platform assets (favicon · logo · splash) — every app reads these live,
            nothing is hard-coded.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Stack>
        <BrandingAccordion
          title="Identity"
          subtitle="App name, default logo, primary color and support contacts."
          defaultExpanded
        >
          <IdentitySection form={form} setForm={setForm} />
        </BrandingAccordion>

        {PLATFORM_SECTIONS.map((section) => (
          <BrandingAccordion
            key={section.prefix}
            title={section.title}
            subtitle={section.subtitle}
          >
            <PlatformAssetsSection
              prefix={section.prefix}
              sizes={section.sizes}
              form={form}
              setForm={setForm}
            />
          </BrandingAccordion>
        ))}

        <BrandingAccordion
          title="Website Logos (marketing sites)"
          subtitle="Header logo, footer logo, favicon + app-store links for duncit.com and its subsites."
        >
          <WebsiteAssetsSection form={form} setForm={setForm} />
        </BrandingAccordion>
      </Stack>

      {opError && <Alert severity="error">{opError}</Alert>}

      <Divider />
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" size="large" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save Branding'}
        </Button>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
