import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { libraryPromptPath } from '../../../lib/library-links';
import PageHeader from '../shared/PageHeader';
import { ASK_DUNCIT_PROMPT_KEYS } from '../shared/queries';

/**
 * Ask Duncit › Prompt Management. The prompts live in the AI Library (one
 * editor, one version history, one reset-to-default) — this page lists the ones
 * Ask Duncit runs on and opens each there. Role-specific instructions are set
 * per role in the Control Center.
 */
export default function AskDuncitPromptsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ askDuncitPromptKeys: string[] }>(ASK_DUNCIT_PROMPT_KEYS, { fetchPolicy: 'cache-first' });
  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.prompts.title')} subtitle={t('ai.askDuncit.prompts.subtitle')} />
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('ai.askDuncit.prompts.roleInstructions')}{' '}
        <Link component={RouterLink} to="/ask-duncit/control-center">
          {t('ai.askDuncit.nav.controlCenter')}
        </Link>
      </Alert>
      <QueryGuard loading={loading} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
        {() => (
          <Stack spacing={1.5}>
            {(data?.askDuncitPromptKeys ?? []).map((key) => (
              <Card key={key} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {key}
                  </Typography>
                  <Link component={RouterLink} to={libraryPromptPath(key)}>
                    {t('ai.askDuncit.prompts.open')}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </QueryGuard>
    </Box>
  );
}
