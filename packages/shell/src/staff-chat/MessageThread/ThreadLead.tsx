import { Box, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** More history exists above — offers the page before this one. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Nothing has been said yet. */
  empty: boolean;
  onLoadMore: () => void;
}

/** What sits above the first entry: the way back to earlier history, and the
 *  invitation an empty conversation opens on. */
export function ThreadLead({ hasMore, loadingMore, empty, onLoadMore }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {hasMore && (
        <Box sx={{ textAlign: 'center' }}>
          <DuncitButton size="small" onClick={onLoadMore} disabled={loadingMore}>
            {t(loadingMore ? 'shell.chat.thread.loading' : 'shell.chat.thread.earlier')}
          </DuncitButton>
        </Box>
      )}

      {empty && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: 'center',
            py: 4
          }}>
          {t('shell.chat.thread.sayHello')}
        </Typography>
      )}
    </>
  );
}
