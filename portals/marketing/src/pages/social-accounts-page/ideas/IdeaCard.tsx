import { Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { IDEA_FORMAT_LABEL, IDEA_STATUS_LABEL } from '../copy';
import type { SocialIdea, SocialIdeaStatus } from '../publish.queries';

const STATUS_COLORS = { NEW: 'info', USED: 'success', DISMISSED: 'default' } as const;

interface Props {
  idea: SocialIdea;
  onUse: (idea: SocialIdea) => void;
  onStatus: (idea: SocialIdea, status: SocialIdeaStatus) => Promise<void>;
  onDelete: (idea: SocialIdea) => Promise<void>;
}

/** One AI idea: the caption ready to post, its tags, where it fits, and why it should work. */
export default function IdeaCard({ idea, onUse, onStatus, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const dismissed = idea.status === 'DISMISSED';

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }} data-testid={`social-idea-${idea.id}`}>
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
            {idea.title}
          </Typography>
          <StatusChip status={idea.status} colorMap={STATUS_COLORS} label={t(IDEA_STATUS_LABEL[idea.status])} />
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 1 }}>
          {idea.caption}
        </Typography>
        {idea.hashtags.length > 0 && (
          <Typography variant="body2" sx={{ color: 'primary.main', mb: 1 }}>
            {idea.hashtags.map((tag) => `#${tag}`).join(' ')}
          </Typography>
        )}
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          {idea.platforms.map((platform) => (
            <PlatformIcon key={platform} platform={platform} fontSize="small" sx={{ color: 'text.secondary' }} />
          ))}
          <Chip size="small" variant="outlined" label={t(IDEA_FORMAT_LABEL[idea.format])} />
        </Stack>
        {idea.why && (
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
            {idea.why}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <DuncitButton size="small" variant="contained" startIcon={<EditNoteIcon />} onClick={() => onUse(idea)}>
          {t('marketing.social.useIdea')}
        </DuncitButton>
        <DuncitButton size="small" onClick={() => onStatus(idea, dismissed ? 'NEW' : 'DISMISSED')}>
          {dismissed ? t('marketing.social.restoreIdea') : t('marketing.social.dismissIdea')}
        </DuncitButton>
        <DuncitButton size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onDelete(idea)}>
          {t('shell.common.delete')}
        </DuncitButton>
      </CardActions>
    </Card>
  );
}
