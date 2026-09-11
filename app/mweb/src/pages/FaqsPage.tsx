import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Chip,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../i18n/useTranslation';
import SupportShell from './support-hub/SupportShell';
import SectionHeader from '../components/SectionHeader';

/** A filter chip: surface pill at rest, the green primary pill when chosen. */
function chipSx(selected: boolean) {
  return {
    height: 36,
    px: 0.75,
    flexShrink: 0,
    ...(selected ? {} : { bgcolor: 'background.paper' }),
  };
}

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
    <SupportShell title={t('mweb.meta.faqs.title')}>
      <Stack spacing={2.5}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('mweb.common.searchQuestionsEGRefundHost')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper', minHeight: 50 },
            '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--duncit-card-border)' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }
          }}
        />

        {groups.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
            <Chip
              label={t('mweb.common.all')}
              color={activeSuper === 'ALL' ? 'primary' : 'default'}
              onClick={() => setActiveSuper('ALL')}
              sx={chipSx(activeSuper === 'ALL')}
            />
            {groups.map((g) => {
              const id = g.super_category?.id ?? 'GENERIC';
              const label = g.super_category?.name ?? 'General';
              return (
                <Chip
                  key={id}
                  label={label}
                  color={activeSuper === id ? 'primary' : 'default'}
                  onClick={() => setActiveSuper(id)}
                  sx={chipSx(activeSuper === id)}
                />
              );
            })}
          </Stack>
        )}

        {loading && (
          <Stack spacing={1.5}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: '24px' }} />
            ))}
          </Stack>
        )}

        {error && <Alert severity="error">{error.message}</Alert>}

        {!loading && filteredGroups.length === 0 && (
          <Alert severity="info">{t('mweb.faqsPage.noFaqsMatchYourSearch')}</Alert>
        )}

        {filteredGroups.map((g) => (
          <Stack key={g.super_category?.id ?? 'GENERIC'} spacing={1.5}>
            <SectionHeader title={g.super_category?.name ?? 'General'} />
            <Stack spacing={1}>
              {g.faqs.map((f: any) => (
                <Accordion key={f.id} disableGutters elevation={0} sx={{ overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 56 }}>
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                      {f.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2, pb: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        whiteSpace: 'pre-wrap'
                      }}>
                      {f.answer}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Chip label={t('mweb.faqsPage.helpful')} />
                      <Chip label={t('mweb.faqsPage.notReally')} />
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </SupportShell>
  );
}
