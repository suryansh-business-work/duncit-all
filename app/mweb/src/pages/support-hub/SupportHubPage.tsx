import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import SupportShell from './SupportShell';
import SupportSectionCard from './SupportSectionCard';
import FaqSearch from './FaqSearch';
import FrequentlyAsked from './FrequentlyAsked';
import SupportTopics from './SupportTopics';
import StartConversation from './StartConversation';
import FaqAnswerDialog from './FaqAnswerDialog';
import { SUPPORT_SECTIONS } from './sections';
import { PUBLIC_FAQ_GROUPS, type FaqGroup, type FaqItem } from './faqQueries';
import { useTranslation } from '../../i18n/useTranslation';

const TOP_FAQ_COUNT = 6;
const MORE_WAYS = SUPPORT_SECTIONS.filter((section) => section.key !== 'live');

export default function SupportHubPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(PUBLIC_FAQ_GROUPS, { fetchPolicy: 'cache-and-network' });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FaqItem | null>(null);

  const groups: FaqGroup[] = data?.publicFaqGroups ?? [];
  const topFaqs = useMemo(() => groups.flatMap((g) => g.faqs).slice(0, TOP_FAQ_COUNT), [groups]);
  const searching = query.trim().length > 0;

  return (
    <SupportShell
      title={t('mweb.supportHub.haveABurningQuestion')}
      subtitle={t('mweb.supportHub.searchOurHelpCenterOrTalk')}
      icon={<LiveHelpIcon fontSize="small" />}
      backTo="/"
    >
      <Stack spacing={2}>
        <FaqSearch query={query} onQueryChange={setQuery} onOpen={setSelected} />

        {error && <Alert severity="error">{error.message}</Alert>}

        {!searching && loading && (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: '16px' }} />
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: '16px' }} />
          </Stack>
        )}

        {!searching && !loading && (
          <>
            <FrequentlyAsked faqs={topFaqs} onOpen={setSelected} />
            <SupportTopics groups={groups} />
          </>
        )}

        <StartConversation />

        <Box>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            More ways to reach us
          </Typography>
          <Box
            sx={{
              mt: 0.5,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {MORE_WAYS.map((section) => (
              <SupportSectionCard key={section.key} section={section} />
            ))}
          </Box>
        </Box>
      </Stack>

      <FaqAnswerDialog faq={selected} onClose={() => setSelected(null)} />
    </SupportShell>
  );
}
