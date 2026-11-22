import { Chip, Stack, Typography } from '@mui/material';
import AssistantIcon from '@mui/icons-material/Assistant';
import HistoryIcon from '@mui/icons-material/History';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { DuncitIconButton } from '@duncit/buttons';
import { roleLabelKey } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  roleKey: string | null;
  showHistory: boolean;
  canHandOver: boolean;
  onHistory: () => void;
  onNew: () => void;
  onHandOver: () => void;
}

/**
 * The title bar, with the role the assistant is acting for shown above the
 * conversation — what it may see and do follows from that role.
 */
export default function AskDuncitHeader({ roleKey, showHistory, canHandOver, onHistory, onNew, onHandOver }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <AssistantIcon color="primary" aria-hidden />
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {t('askDuncit.title')}
        </Typography>
        {roleKey && (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('askDuncit.actingAs')}
            </Typography>
            <Chip data-testid="ask-duncit-role" size="small" color="primary" variant="outlined" label={t(roleLabelKey(roleKey))} />
          </Stack>
        )}
      </Stack>
      {canHandOver && (
        <DuncitIconButton aria-label={t('askDuncit.handover.open')} onClick={onHandOver}>
          <SupportAgentIcon />
        </DuncitIconButton>
      )}
      <DuncitIconButton aria-label={t('askDuncit.newChat')} onClick={onNew}>
        <AddCommentOutlinedIcon />
      </DuncitIconButton>
      {showHistory && (
        <DuncitIconButton aria-label={t('askDuncit.history.open')} onClick={onHistory}>
          <HistoryIcon />
        </DuncitIconButton>
      )}
    </Stack>
  );
}
