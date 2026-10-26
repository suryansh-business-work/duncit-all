import { Avatar, AvatarGroup, Tooltip } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { VenueChatReadMark } from '@duncit/utils';

/**
 * The faces of everyone who has read the thread up to this line — the venue as
 * the venue, each host as themself — drawn small under it, as Google Chat does.
 * Nothing when nobody's last read line is this one.
 */
export default function SeenFaces({ marks }: Readonly<{ marks: readonly VenueChatReadMark[] | undefined }>) {
  const { t } = useTranslation();
  if (!marks?.length) return null;
  const label = t('availability.offers.chat.seenBy', { vars: { names: marks.map((mark) => mark.name).join(', ') } });

  return (
    <Tooltip title={label}>
      <AvatarGroup
        max={4}
        role="img"
        aria-label={label}
        data-testid="seen-faces"
        sx={{ justifyContent: 'flex-end', mt: 0.25, '& .MuiAvatar-root': { width: 18, height: 18, fontSize: 10 } }}
      >
        {marks.map((mark) => (
          <Avatar key={mark.user_id} alt="" src={mark.photo ?? undefined}>
            {mark.name.charAt(0).toUpperCase()}
          </Avatar>
        ))}
      </AvatarGroup>
    </Tooltip>
  );
}
