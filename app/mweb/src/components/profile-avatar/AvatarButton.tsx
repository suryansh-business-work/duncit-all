import { Avatar, Box, CircularProgress, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  photo?: string | null;
  initial: string;
  size: number;
  hasStory: boolean;
  saving: boolean;
  onAvatarClick: () => void;
  onEdit: (el: HTMLElement) => void;
}

/**
 * The avatar visual: story ring, tap to view, and an edit pencil that opens the
 * photo menu.
 *
 * There is deliberately no "+" badge and no add-a-story path here any more. A
 * story is posted from Home, where the whole status rail is — putting a second
 * entrance on the profile photo meant the same picture both WAS the account's
 * identity and was a button that published something, and people tapped it
 * expecting the first.
 */
export default function AvatarButton({
  photo,
  initial,
  size,
  hasStory,
  saving,
  onAvatarClick,
  onEdit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ringSx = hasStory
    ? { p: '3px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff8b5f, #ed4f7a)' }
    : {};
  const label = hasStory
    ? t('mweb.profileAvatar.viewYourStory')
    : t('mweb.profileAvatar.profilePhoto');

  return (
    <Box sx={{ position: 'relative', width: size + 8, height: size + 8 }}>
      <Tooltip title={label}>
        <Box
          role="button"
          aria-label={label}
          data-testid="avatar-button"
          onClick={onAvatarClick}
          sx={{ cursor: 'pointer', display: 'inline-flex', ...ringSx }}
        >
          <Avatar
            src={photo || undefined}
            sx={{
              width: size,
              height: size,
              bgcolor: 'primary.main',
              fontSize: size * 0.4,
              border: 2,
              borderColor: 'background.paper',
            }}
          >
            {initial}
          </Avatar>
        </Box>
      </Tooltip>

      <Tooltip title={t('mweb.profileAvatar.changeProfilePhoto')}>
        <DuncitIconButton
          size="small"
          data-testid="avatar-edit"
          aria-label={t('mweb.common.editPhoto')}
          disabled={saving}
          onClick={(e) => onEdit(e.currentTarget)}
          sx={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {saving ? <CircularProgress size={16} /> : <EditIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
    </Box>
  );
}
