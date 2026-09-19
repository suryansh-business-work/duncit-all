import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useWebT } from '../../../shared/i18n';
import { eventUrl } from '../../lib/calendarLinks';
import { shareOrCopy } from '../../lib/clipboard';

/** The device share sheet where there is one; the clipboard everywhere else. */
export function ShareButton({ title, slug }: Readonly<{ title: string; slug: string }>) {
  const { t } = useWebT();
  const share = async () => {
    const outcome = await shareOrCopy(title, eventUrl(slug));
    if (outcome === 'copied') notifySuccess(t('liteWeb.event.linkCopied'));
    else if (outcome === 'failed') notifyError(t('liteWeb.common.copyFailed'));
  };
  return (
    <DuncitButton variant="outlined" startIcon={<ShareOutlinedIcon />} onClick={share} data-testid="event-share">
      {t('liteWeb.event.share')}
    </DuncitButton>
  );
}
