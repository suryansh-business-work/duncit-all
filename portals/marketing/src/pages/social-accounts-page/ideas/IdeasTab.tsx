import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { notify, useConfirm } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { IDEA_STATUS_LABEL } from '../copy';
import {
  DELETE_SOCIAL_IDEA,
  GENERATE_SOCIAL_IDEAS,
  SET_SOCIAL_IDEA_STATUS,
  SOCIAL_IDEAS,
  type SocialIdea,
  type SocialIdeaStatus,
} from '../publish.queries';
import { IdeaGenerateForm, type IdeaGenerateFormValues } from '../idea-generate-form';
import IdeaCard from './IdeaCard';

type Filter = SocialIdeaStatus | 'ALL';
const FILTERS: readonly SocialIdeaStatus[] = ['NEW', 'USED', 'DISMISSED'];
const REFRESH = ['SocialIdeas'];

interface Props {
  onUse: (idea: SocialIdea) => void;
}

/**
 * Buffer's Ideas board, written by the AI: ask for ideas on a brief, keep the
 * good ones, dismiss the rest, and turn one into a post in a click.
 */
export default function IdeasTab({ onUse }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('NEW');
  const { data, loading, error } = useQuery<{ socialIdeas: SocialIdea[] }>(SOCIAL_IDEAS, {
    variables: { status: filter === 'ALL' ? null : filter },
    fetchPolicy: 'cache-and-network',
  });
  const [generateMut] = useMutation<{ generateSocialIdeas: SocialIdea[] }>(GENERATE_SOCIAL_IDEAS, { refetchQueries: REFRESH });
  const [statusMut] = useMutation(SET_SOCIAL_IDEA_STATUS, { refetchQueries: REFRESH });
  const [deleteMut] = useMutation(DELETE_SOCIAL_IDEA, { refetchQueries: REFRESH });
  const ideas = data?.socialIdeas ?? [];

  const generate = async (values: IdeaGenerateFormValues) => {
    try {
      const { data: made } = await generateMut({
        variables: { input: { brief: values.brief, platforms: values.platforms, count: values.count } },
      });
      notify(t('marketing.social.ideasReady', { count: made?.generateSocialIdeas.length ?? 0 }), 'success');
      setFilter('NEW');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const setStatus = async (idea: SocialIdea, status: SocialIdeaStatus) => {
    try {
      await statusMut({ variables: { id: idea.id, status } });
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const remove = async (idea: SocialIdea) => {
    if (!(await confirm({ title: t('marketing.social.deleteIdeaTitle'), message: idea.title, destructive: true }))) return;
    try {
      await deleteMut({ variables: { id: idea.id } });
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2} data-testid="social-ideas">
      <SectionCard title={t('marketing.social.generateIdeasTitle')} subtitle={t('marketing.social.generateIdeasSubtitle')}>
        <IdeaGenerateForm onSubmit={generate} />
      </SectionCard>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_event, next: Filter | null) => {
          if (next) setFilter(next);
        }}
        aria-label={t('marketing.social.ideasShown')}
      >
        {FILTERS.map((status) => (
          <ToggleButton key={status} value={status}>
            {t(IDEA_STATUS_LABEL[status])}
          </ToggleButton>
        ))}
        <ToggleButton value="ALL">{t('marketing.social.allIdeas')}</ToggleButton>
      </ToggleButtonGroup>
      {loading && !data && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {data && ideas.length === 0 && (
        <Alert severity="info" variant="outlined">
          {t('marketing.social.noIdeas')}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onUse={onUse} onStatus={setStatus} onDelete={remove} />
        ))}
      </Box>
    </Stack>
  );
}
