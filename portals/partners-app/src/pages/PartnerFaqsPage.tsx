import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '@duncit/shell';

const PARTNER_FAQS = gql`
  query PartnerFaqs($topic: PartnerFaqTopic) {
    publicPartnerFaqs(topic: $topic) {
      id
      partner_topic
      question
      answer
    }
  }
`;

const topics = (t: Translate) => [
  { value: 'ALL', label: t('partners.common.all') },
  { value: 'VENUE', label: t('partners.common.venue') },
  { value: 'HOST', label: t('partners.common.host') },
  { value: 'PRODUCTS', label: t('partners.page.products') },
];

type Translate = ReturnType<typeof useTranslation>['t'];

/** Topic names read from the same list the filter renders. */
const topicLabel = (t: Translate): Record<string, string> =>
  Object.fromEntries(topics(t).filter((x) => x.value !== 'ALL').map((x) => [x.value, x.label]));

export default function PartnerFaqsPage() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState<ReturnType<typeof topics>[number]['value']>('ALL');
  const [search, setSearch] = useState('');
  const { data, loading, error } = useQuery(PARTNER_FAQS, {
    variables: { topic: topic === 'ALL' ? null : topic },
    fetchPolicy: 'cache-and-network',
  });
  const faqs = data?.publicPartnerFaqs ?? [];
  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return faqs;
    return faqs.filter((faq: any) => `${faq.question} ${faq.answer}`.toLowerCase().includes(query));
  }, [faqs, search]);

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)' }}>
            <HelpOutlineIcon />
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>{t('partners.page.partnerHelp')}</Typography>
            <Typography variant="h4" fontWeight={950}>FAQs</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)', mt: 0.75 }}>{t('partners.page.answersForVenuesHostsAndProduct')}</Typography>
          </Box>
        </Stack>
      </Box>

      <TextField
        fullWidth
        label={t('partners.page.searchFaqs')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {topics(t).map((item) => (
          <Chip key={item.value} label={item.label} color={topic === item.value ? 'primary' : 'default'} variant={topic === item.value ? 'filled' : 'outlined'} onClick={() => setTopic(item.value)} />
        ))}
      </Stack>

      {loading && !data && <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={24} /></Stack>}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && filteredFaqs.length === 0 && <Alert severity="info">{t('partners.page.noFaqsFoundForThisFilter')}</Alert>}
      <Stack spacing={1.25}>
        {filteredFaqs.map((faq: any) => (
          <Accordion key={faq.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ width: '100%' }}>
                <Typography fontWeight={900} sx={{ flex: 1 }}>{faq.question}</Typography>
                <Chip size="small" label={topicLabel(t)[faq.partner_topic] || 'Partner'} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails><Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{faq.answer}</Typography></AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Stack>
  );
}