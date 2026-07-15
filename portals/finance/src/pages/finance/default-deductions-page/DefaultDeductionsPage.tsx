import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import { DEDUCTION_SETTINGS, UPDATE_DEDUCTIONS } from './queries';
import DeductionSlider from './DeductionSlider';

interface Deductions {
  gst_pct: number;
  platform_fee_pct: number;
  default_host_commission_pct: number;
  default_venue_commission_pct: number;
  default_product_commission_pct: number;
  default_club_admin_pct: number;
  default_backout_deduction_pct: number;
}

const BLANK: Deductions = {
  gst_pct: 0,
  platform_fee_pct: 0,
  default_host_commission_pct: 0,
  default_venue_commission_pct: 0,
  default_product_commission_pct: 0,
  default_club_admin_pct: 0,
  default_backout_deduction_pct: 0,
};

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function DeductionCard({ title, subtitle, children }: Readonly<SectionProps>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DefaultDeductionsPage() {
  const { data, loading, refetch } = useQuery(DEDUCTION_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_DEDUCTIONS);
  const [form, setForm] = useState<Deductions>(BLANK);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fs = data?.financeSettings;
    if (!fs) return;
    // Map only the deduction fields — never spread the raw result, which carries
    // __typename + updated_at that the UpdateFinanceSettingsInput rejects.
    setForm({
      gst_pct: fs.gst_pct ?? 0,
      platform_fee_pct: fs.platform_fee_pct ?? 0,
      default_host_commission_pct: fs.default_host_commission_pct ?? 0,
      default_venue_commission_pct: fs.default_venue_commission_pct ?? 0,
      default_product_commission_pct: fs.default_product_commission_pct ?? 0,
      default_club_admin_pct: fs.default_club_admin_pct ?? 0,
      default_backout_deduction_pct: fs.default_backout_deduction_pct ?? 0,
    });
  }, [data]);

  const set = (key: keyof Deductions) => (value: number) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setError(null);
    try {
      await updateMut({ variables: { input: form } });
      setToast('Default deductions saved');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <PercentIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Default Deductions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Global defaults used at settlement. Override per host, venue or brand from the Onboarding portal.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        <Alert severity="info">
          How pod money flows: the customer price is GST-inclusive. GST is extracted first, then the
          platform fee comes off the net; the venue is paid its fixed booked slot price from the
          remaining pool and the host keeps the remainder — there are no share percentages. Duncit's
          commission is then deducted from each party's amount. Per-host, per-venue and per-brand
          commission overrides are managed in the Onboarding portal's Onboarded lists.
        </Alert>

        <DeductionCard title="GST" subtitle="Tax extracted from the GST-inclusive customer payment.">
          <DeductionSlider label="GST" value={form.gst_pct} onChange={set('gst_pct')} max={28} />
        </DeductionCard>

        <DeductionCard title="Platform Fees" subtitle="Duncit's platform fee on the net (post-GST) amount.">
          <DeductionSlider label="Platform fee" value={form.platform_fee_pct} onChange={set('platform_fee_pct')} max={30} />
        </DeductionCard>

        <DeductionCard title="Host" subtitle="The commission Duncit takes from the host's pool remainder.">
          <DeductionSlider label="Commission from host" value={form.default_host_commission_pct} onChange={set('default_host_commission_pct')} />
        </DeductionCard>

        <DeductionCard title="Venue" subtitle="The commission Duncit takes from the venue's booked slot price.">
          <DeductionSlider label="Commission from venue" value={form.default_venue_commission_pct} onChange={set('default_venue_commission_pct')} />
        </DeductionCard>

        <DeductionCard title="Products" subtitle="Duncit's commission on a product's selling price.">
          <DeductionSlider label="Product commission" value={form.default_product_commission_pct} onChange={set('default_product_commission_pct')} max={50} />
        </DeductionCard>

        <DeductionCard title="Club Admin" subtitle="Cut taken off every pod's pool after GST + platform fee, before the venue/host split.">
          <DeductionSlider
            label="Club admin cut (0-10%)"
            value={form.default_club_admin_pct}
            onChange={set('default_club_admin_pct')}
            max={10}
            hint="Deducted from each pod's pool after GST + platform fee and shown in the host's create-pod pricing. Counts as Duncit revenue (disbursed to the club admin later)."
          />
        </DeductionCard>

        <DeductionCard title="Backouts" subtitle="Kept from a member's refund when they back out of a paid pod.">
          <DeductionSlider
            label="Backout payment deduction charges (0-100%)"
            value={form.default_backout_deduction_pct}
            onChange={set('default_backout_deduction_pct')}
            hint="Percentage kept from a member's refund when they back out of a paid pod. 0% = full refund. Applied by the refund flow (shipping later)."
          />
        </DeductionCard>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="large" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Deductions'}
          </Button>
        </Box>
      </Stack>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
