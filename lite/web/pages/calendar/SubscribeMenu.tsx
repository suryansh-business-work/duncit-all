import { useId, useState } from 'react';
import { ListItemIcon, Menu, MenuItem } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useWebT } from '../../../shared/i18n';
import { calendarFeedUrl, calendarWebcalUrl, googleSubscribeUrl, outlookSubscribeUrl } from '../../lib/calendarLinks';
import { copyText } from '../../lib/clipboard';

/** "Subscribe in your calendar app": Google, Apple, Outlook, or the feed link to paste anywhere else. */
export function SubscribeMenu({ slug, name }: Readonly<{ slug: string; name: string }>) {
  const { t } = useWebT();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const copy = () => {
    close();
    const url = calendarFeedUrl(slug);
    copyText(url)
      .then((copied) => (copied ? notifySuccess(t('liteWeb.calendar.feedCopied')) : notifyError(t('liteWeb.calendar.feedCopyFailed', { vars: { url } }))))
      .catch(() => notifyError(t('liteWeb.calendar.feedCopyFailed', { vars: { url } })));
  };
  return (
    <>
      <DuncitButton
        variant="text"
        startIcon={<RssFeedIcon />}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid="calendar-webcal"
      >
        {t('liteWeb.calendar.subscribeInApp')}
      </DuncitButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem component="a" href={googleSubscribeUrl(slug)} target="_blank" rel="noopener noreferrer" onClick={close} data-testid="calendar-subscribe-google">
          <ListItemIcon>
            <EventOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('liteWeb.calendar.subscribeGoogle')}
        </MenuItem>
        <MenuItem component="a" href={calendarWebcalUrl(slug)} onClick={close} data-testid="calendar-subscribe-apple">
          <ListItemIcon>
            <EventOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('liteWeb.calendar.subscribeApple')}
        </MenuItem>
        <MenuItem component="a" href={outlookSubscribeUrl(slug, name)} target="_blank" rel="noopener noreferrer" onClick={close} data-testid="calendar-subscribe-outlook">
          <ListItemIcon>
            <EventOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {t('liteWeb.calendar.subscribeOutlook')}
        </MenuItem>
        <MenuItem onClick={copy} data-testid="calendar-subscribe-copy">
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          {t('liteWeb.calendar.copyFeed')}
        </MenuItem>
      </Menu>
    </>
  );
}
