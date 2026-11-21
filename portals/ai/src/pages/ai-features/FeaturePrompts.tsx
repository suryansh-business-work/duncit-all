import { Link as RouterLink } from 'react-router';
import { Link, Stack, Tooltip, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useTranslation } from '@duncit/shell';
import { libraryPromptPath } from '../../lib/library-links';
import type { AiFeature, AiFeaturePrompt } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The role label the AI Library itself shows, so both pages name a turn the same way. */
const roleLabel = (t: Translate, role: AiFeaturePrompt['role']) =>
  role === 'USER' ? t('ai.library.roles.USER') : t('ai.library.roles.SYSTEM');

/** Where a prompt stands in the library, as an icon with its reason — never colour alone. */
function PromptState({ prompt }: Readonly<{ prompt: AiFeaturePrompt }>) {
  const { t } = useTranslation();
  if (!prompt.in_library) {
    return (
      <Tooltip title={t('ai.features.promptPendingHint')} describeChild>
        <HourglassEmptyIcon fontSize="inherit" color="disabled" titleAccess={t('ai.features.promptPending')} />
      </Tooltip>
    );
  }
  if (prompt.matches_default) return null;
  return (
    <Tooltip title={t('ai.features.promptEditedHint')} describeChild>
      <EditNoteIcon fontSize="inherit" color="warning" titleAccess={t('ai.features.promptEdited')} />
    </Tooltip>
  );
}

interface Props {
  feature: Pick<AiFeature, 'prompts' | 'prompts_note'>;
  /** One line for a table cell; a labelled list on the feature's own page. */
  variant: 'cell' | 'list';
}

/**
 * The AI Library code prompts a feature runs on, each a link that opens that
 * prompt's full details in the library. The list comes from the server's prompt
 * catalogue, the same declaration the library is seeded from, so the two pages
 * cannot name different prompts for one feature.
 */
export default function FeaturePrompts({ feature, variant }: Readonly<Props>) {
  const { t } = useTranslation();
  if (feature.prompts.length === 0) {
    return (
      <Typography variant="caption" noWrap={variant === 'cell'} title={feature.prompts_note ?? ''} sx={{ color: 'text.secondary' }}>
        {feature.prompts_note}
      </Typography>
    );
  }
  const list = variant === 'list';
  return (
    <Stack
      direction={list ? 'column' : 'row'}
      spacing={list ? 0.75 : 1}
      sx={{ minWidth: 0, overflow: 'hidden', alignItems: list ? 'flex-start' : 'center' }}
    >
      {feature.prompts.map((prompt) => (
        <Stack key={prompt.key} direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Link
            component={RouterLink}
            to={libraryPromptPath(prompt.key)}
            variant={list ? 'body2' : 'caption'}
            noWrap
            title={`${prompt.name} · ${roleLabel(t, prompt.role)}`}
            aria-label={t('ai.features.promptOpen', { vars: { name: prompt.name } })}
            sx={{ fontFamily: list ? undefined : 'monospace' }}
          >
            {list ? prompt.name : prompt.key}
          </Link>
          <PromptState prompt={prompt} />
          {list && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
              {prompt.key} · {roleLabel(t, prompt.role)}
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
