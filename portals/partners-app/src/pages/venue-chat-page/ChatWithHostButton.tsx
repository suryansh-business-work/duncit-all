import { useNavigate } from 'react-router';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import { DuncitButton, type DuncitButtonProps } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { venueChatRoute } from './queries';

interface Props {
  podId: string;
  variant?: DuncitButtonProps['variant'];
}

/** "Chat with host" on a venue's booking surfaces — opens the pod's venue ↔ host thread. */
export default function ChatWithHostButton({ podId, variant = 'outlined' }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <DuncitButton variant={variant} startIcon={<ForumRoundedIcon />} onClick={() => navigate(venueChatRoute(podId))}>
      {t('mweb.venueChat.chatWithHost')}
    </DuncitButton>
  );
}
