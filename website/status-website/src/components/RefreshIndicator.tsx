import { Fade, LinearProgress } from '@mui/material';
import { useTranslation } from '../i18n';

/**
 * A hairline progress bar pinned to the top of the viewport while any fetch is
 * in flight.
 *
 * The board refreshes itself every 60 seconds and used to do it in complete
 * silence, so a reader watching for a service to come back had no way to tell a
 * live figure from one that was already a minute old — and no way to tell the
 * page was still trying at all.
 */
export default function RefreshIndicator({ active }: Readonly<{ active: boolean }>) {
  const { t } = useTranslation();
  return (
    <Fade in={active} unmountOnExit>
      <LinearProgress
        role="progressbar"
        aria-label={t('status.loading.refreshing')}
        sx={{
          position: 'fixed',
          insetInline: 0,
          top: 0,
          height: 3,
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      />
    </Fade>
  );
}
