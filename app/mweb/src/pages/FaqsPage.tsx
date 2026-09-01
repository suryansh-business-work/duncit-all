import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../i18n/useTranslation';

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
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(PUBLIC_FAQS, { fetchPolicy: 'cache-and-network' });
  const [params] = useSearchParams();
  const [activeSuper, setActiveSuper] = useState<string>(params.get('cat') ?? 'ALL');
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
    <Stack spacing={2} sx={{ width: '100%', maxWidth: 760, mx: 'auto' }}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)', boxShadow: '0 14px 28px rgba(255,79,115,0.30)' }}>
          <HelpOutlineIcon />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            Got questions?
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            Browse by topic. Can't find it? Support replies within 24h.
          </Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1, borderRadius: '16px' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('mweb.common.searchQuestionsEGRefundHost')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Paper>

      {groups.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Chip
            label={t('mweb.common.all')}
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
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: '16px' }} />
          ))}
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {!loading && filteredGroups.length === 0 && (
        <Alert severity="info">{t('mweb.faqsPage.noFaqsMatchYourSearch')}</Alert>
      )}

      {filteredGroups.map((g) => (
        <Box key={g.super_category?.id ?? 'GENERIC'}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            {g.super_category?.name ?? 'General'}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {g.faqs.map((f: any) => (
              <Accordion key={f.id} disableGutters elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {f.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      whiteSpace: 'pre-wrap'
                    }}>
                    {f.answer}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Chip label={t('mweb.faqsPage.helpful')} variant="outlined" sx={{ fontWeight: 700 }} />
                    <Chip label={t('mweb.faqsPage.notReally')} variant="outlined" sx={{ fontWeight: 700 }} />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
