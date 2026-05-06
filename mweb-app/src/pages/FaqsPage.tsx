import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Container,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';

const PUBLIC_FAQS = gql`
  query PublicFaqs {
    publicFaqGroups {
      super_category {
        id
        name
        slug
        icon
      }
      faqs {
        id
        question
        answer
      }
    }
  }
`;

export default function FaqsPage() {
  const { data, loading, error } = useQuery(PUBLIC_FAQS, { fetchPolicy: 'cache-and-network' });
  const [activeSuper, setActiveSuper] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const groups: any[] = data?.publicFaqGroups ?? [];

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => activeSuper === 'ALL' || (g.super_category?.id ?? 'GENERIC') === activeSuper)
      .map((g) => ({
        ...g,
        faqs: q
          ? g.faqs.filter(
              (f: any) =>
                f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
            )
          : g.faqs,
      }))
      .filter((g) => g.faqs.length > 0);
  }, [groups, activeSuper, search]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <HelpOutlineIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Find answers grouped by category. Can't find what you need? Reach out via Support.
          </Typography>
        </Box>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Search questions…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mt: 3, mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {groups.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="All"
            color={activeSuper === 'ALL' ? 'primary' : 'default'}
            variant={activeSuper === 'ALL' ? 'filled' : 'outlined'}
            onClick={() => setActiveSuper('ALL')}
          />
          {groups.map((g) => {
            const id = g.super_category?.id ?? 'GENERIC';
            const label = g.super_category?.name ?? 'General';
            return (
              <Chip
                key={id}
                label={label}
                color={activeSuper === id ? 'primary' : 'default'}
                variant={activeSuper === id ? 'filled' : 'outlined'}
                onClick={() => setActiveSuper(id)}
              />
            );
          })}
        </Stack>
      )}

      {loading && (
        <Stack spacing={1.5}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {!loading && filteredGroups.length === 0 && (
        <Alert severity="info">No FAQs match your search.</Alert>
      )}

      {filteredGroups.map((g) => (
        <Box key={g.super_category?.id ?? 'GENERIC'} sx={{ mt: 3 }}>
          <Typography variant="overline" color="text.secondary">
            {g.super_category?.name ?? 'General'}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {g.faqs.map((f: any) => (
              <Accordion key={f.id} disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={600}>
                    {f.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {f.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>
      ))}
    </Container>
  );
}
