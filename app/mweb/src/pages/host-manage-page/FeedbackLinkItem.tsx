import type { MouseEvent } from 'react';
import { IconButton, ListItemIcon, ListItemText, MenuItem, Stack, Tooltip } from '@mui/material';
import StarRateIcon from '@mui/icons-material/StarRate';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  onOpen: () => void;
  onShare: () => void;
  onCopy: () => void;
}

/**
 * The pod's rating link, as one menu line with three ways to use it: tap the
 * row to open the form yourself, or take the link with the two buttons beside
 * it — most hosts want to send it, not fill it in.
 *
 * The buttons stop the click reaching the row, or copying the link would also
 * navigate away from the list the host is working in.
 */
export default function FeedbackLinkItem({ onOpen, onShare, onCopy }: Readonly<Props>) {
  const { t } = useTranslation();

  const act = (action: () => void) => (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    action();
  };

  return (
    <MenuItem onClick={onOpen}>
      <ListItemIcon>
        <StarRateIcon fontSize="small" sx={{ color: 'warning.main' }} />
      </ListItemIcon>
      <ListItemText primary={t('mweb.podFeedback.feedbackLink')} />
      <Stack direction="row" spacing={0.5} sx={{ pl: 1 }}>
        <Tooltip title={t('mweb.podFeedback.shareLink')}>
          <IconButton
            size="small"
            edge="end"
            aria-label={t('mweb.podFeedback.shareLink')}
            onClick={act(onShare)}
          >
            <IosShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('mweb.podFeedback.copyLink')}>
          <IconButton
            size="small"
            edge="end"
            aria-label={t('mweb.podFeedback.copyLink')}
            onClick={act(onCopy)}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </MenuItem>
  );
}
