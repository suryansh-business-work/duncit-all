import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { libraryPromptPath } from '../../lib/library-links';
import type { LibraryPromptStat } from './queries';

interface Props {
  prompts: readonly LibraryPromptStat[];
  emptyText: string;
  /** Print when each was last updated (the "recently updated" list). */
  showUpdated?: boolean;
}

/** Prompts as links that open each one's details in the AI Library. */
export default function PromptLinks({ prompts, emptyText, showUpdated = false }: Readonly<Props>) {
  const { t } = useTranslation();
  if (prompts.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {prompts.map((prompt) => (
        <Stack component="li" key={prompt.id} direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0 }}>
          {prompt.key ? (
            <Link component={RouterLink} to={libraryPromptPath(prompt.key, prompt.kind)} variant="body2" noWrap>
              {prompt.name}
            </Link>
          ) : (
            <Typography variant="body2" noWrap>
              {prompt.name}
            </Typography>
          )}
          {showUpdated && prompt.updated_at && (
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {t('ai.libraryDashboard.updatedOn', { vars: { when: formatDateTime(prompt.updated_at) } })}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
