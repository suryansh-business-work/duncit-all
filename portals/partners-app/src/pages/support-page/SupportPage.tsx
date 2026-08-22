import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SupportForm, { toContactInput, type SupportFormValues } from '../../forms/support';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

const SUPPORT_PAGE = gql`
  query PartnerSupportPage {
    me { full_name first_name last_name email }
  }
`;

const SUBMIT_SUPPORT = gql`
  mutation PartnerSubmitSupport($input: SubmitContactInput!) {
    submitContactForm(input: $input) { ok message }
  }
`;

export default function SupportPage() {
  const { t } = useTranslation();
  const { data, loading: loadingAccount } = useQuery(SUPPORT_PAGE, { fetchPolicy: 'cache-first' });
  const [submitSupport, { loading }] = useMutation(SUBMIT_SUPPORT);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = data?.me;
  const name = me?.full_name || [me?.first_name, me?.last_name].filter(Boolean).join(' ');

  const handleSubmit = async (values: SupportFormValues) => {
    setError(null);
    try {
      const result = await submitSupport({ variables: { input: toContactInput(values) } });
      if (!result.data?.submitContactForm?.ok) throw new Error(result.data?.submitContactForm?.message || t('partners.forms.couldNotSubmitSupportRequest'));
      setMessage(result.data.submitContactForm.message || 'Support request submitted.');
    } catch (submitError) {
      const parsed = parseApiError(submitError);
      setError(parsed);
      throw new Error(parsed);
    }
  };

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 920, mx: 'auto' }}>
      <Box sx={{ p: 2.25, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.25}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>{t('partners.supportPage.partnerSupport')}</Typography>
            <Typography variant="h4" fontWeight={950}>{t('partners.supportPage.needHelp')}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>{t('partners.supportPage.sendHostVenueProductPayoutOr')}</Typography>
          </Box>
          <Chip icon={<SupportAgentIcon />} label={t('partners.supportPage.supportDesk')} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 900, '& .MuiChip-icon': { color: '#fff' } }} />
        </Stack>
      </Box>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={950}>{t('partners.supportPage.createSupportRequest')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('partners.supportPage.yourAccountEmailIsUsedFor')}</Typography>
            </Box>
            {loadingAccount && !data ? <CircularProgress size={24} /> : (
              <SupportForm initialValues={{ name, email: me?.email || '' }} loading={loading} errorMessage={error} onSubmit={handleSubmit} />
            )}
          </Stack>
        </CardContent>
      </Card>
      <Snackbar open={!!message} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>
      </Snackbar>
    </Stack>
  );
}