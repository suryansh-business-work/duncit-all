import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';

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

const topics = [
  { value: 'ALL', label: 'All' },
  { value: 'VENUE', label: 'Venue' },
  { value: 'HOST', label: 'Host' },
  { value: 'PRODUCTS', label: 'Products' },
] as const;

const topicLabel: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', PRODUCTS: 'Products' };

export default function PartnerFaqsPage() {
  const [topic, setTopic] = useState<(typeof topics)[number]['value']>('ALL');
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
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>Partner help</Typography>
            <Typography variant="h4" fontWeight={950}>FAQs</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)', mt: 0.75 }}>Answers for venues, hosts, and product listings.</Typography>
          </Box>
        </Stack>
      </Box>

      <TextField
        fullWidth
        label="Search FAQs"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {topics.map((item) => (
          <Chip key={item.value} label={item.label} color={topic === item.value ? 'primary' : 'default'} variant={topic === item.value ? 'filled' : 'outlined'} onClick={() => setTopic(item.value)} />
        ))}
      </Stack>

      {loading && !data && <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={24} /></Stack>}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && filteredFaqs.length === 0 && <Alert severity="info">No FAQs found for this filter.</Alert>}
      <Stack spacing={1.25}>
        {filteredFaqs.map((faq: any) => (
          <Accordion key={faq.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ width: '100%' }}>
                <Typography fontWeight={900} sx={{ flex: 1 }}>{faq.question}</Typography>
                <Chip size="small" label={topicLabel[faq.partner_topic] || 'Partner'} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails><Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{faq.answer}</Typography></AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Stack>
  );
}