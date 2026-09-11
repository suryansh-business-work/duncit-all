import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
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
import TwoToneHeading from '../../components/TwoToneHeading';
import SectionHeader from '../../components/SectionHeader';

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
    <SupportShell title={t('mweb.support.support')} backTo="/">
      <Stack spacing={3}>
        <Stack spacing={2}>
          <TwoToneHeading lead={t('mweb.supportHub.haveABurningQuestion')} component="h2" />
          <FaqSearch query={query} onQueryChange={setQuery} onOpen={setSelected} />
        </Stack>

        {error && <Alert severity="error">{error.message}</Alert>}

        {!searching && loading && (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: '24px' }} />
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: '24px' }} />
          </Stack>
        )}

        {!searching && !loading && (
          <>
            <FrequentlyAsked faqs={topFaqs} onOpen={setSelected} />
            <SupportTopics groups={groups} />
          </>
        )}

        <StartConversation />

        <Stack spacing={1.5}>
          <SectionHeader title={t('mweb.supportHub.moreWaysToReachUs')} />
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {MORE_WAYS.map((section) => (
              <SupportSectionCard key={section.key} section={section} />
            ))}
          </Box>
        </Stack>
      </Stack>

      <FaqAnswerDialog faq={selected} onClose={() => setSelected(null)} />
    </SupportShell>
  );
}
