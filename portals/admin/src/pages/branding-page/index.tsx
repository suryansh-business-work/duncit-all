import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import IdentitySection from './IdentitySection';
import PlatformAssetsSection from './PlatformAssetsSection';
import WebsiteAssetsSection from './WebsiteAssetsSection';
import FontsSection from './FontsSection';
import OccasionalIconsSection from './OccasionalIconsSection';
import { PLATFORM_SECTIONS } from './sizeGuides';
import { BRANDING, UPDATE_BRANDING, emptyBrandingForm, type BrandingFormState } from './queries';
import { useTranslation } from '@duncit/shell';

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
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function BrandingPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation<any>(UPDATE_BRANDING, { refetchQueries: [t('admin.branding.title')] });

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
      setToast(t('admin.branding.saved'));
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return <QueryGuard loading spinnerSx={{ p: 6 }} />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <BrandingWatermarkIcon color="primary" />
        <Box>
          <Typography variant="h5">{t('admin.branding.title')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Identity, per-platform assets (favicon · logo · splash) — every app reads these live,
            nothing is hard-coded.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Stack>
        <BrandingAccordion
          title={t('admin.branding.identity')}
          subtitle={t('admin.branding.identityHint')}
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
          title={t('admin.branding.websiteLogos')}
          subtitle={t('admin.branding.websiteHint')}
        >
          <WebsiteAssetsSection form={form} setForm={setForm} />
        </BrandingAccordion>

        <BrandingAccordion
          title={t('admin.branding.occasional')}
          subtitle={t('admin.branding.occasionalHint')}
        >
          <OccasionalIconsSection />
        </BrandingAccordion>

        <BrandingAccordion
          title={t('admin.branding.fonts')}
          subtitle={t('admin.branding.fontsHint')}
        >
          <FontsSection form={form} setForm={setForm} />
        </BrandingAccordion>
      </Stack>

      {opError && <Alert severity="error">{opError}</Alert>}

      <Divider />
      <Stack direction="row" sx={{
        justifyContent: "flex-end"
      }}>
        <DuncitButton variant="contained" size="large" onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save Branding'}
        </DuncitButton>
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
