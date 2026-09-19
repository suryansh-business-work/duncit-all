import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { GoogleAnalyticsSiteInput } from '@duncit/gql-types';
import { GoogleAnalyticsSiteFormBody } from './google-analytics-site';
import type { TagDialogState } from './useGoogleAnalyticsActions';

interface Props {
  state: TagDialogState;
  saving: boolean;
  opError: string | null;
  onClose: () => void;
  onSubmit: (input: GoogleAnalyticsSiteInput) => void;
}

/**
 * The tag editor in a dialog. The page mounts it only while open, so the form
 * reads its defaults from the row that was just clicked.
 */
export default function GoogleAnalyticsDialog({ state, saving, opError, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = state.lockSite ? t('tech.googleAnalytics.editTag') : t('tech.googleAnalytics.addTag');
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="google-analytics-dialog-title"
      data-testid="google-analytics-dialog"
    >
      <DialogTitle id="google-analytics-dialog-title">{title}</DialogTitle>
      <DialogContent dividers>
        <GoogleAnalyticsSiteFormBody
          siteOptions={state.siteOptions}
          lockSite={state.lockSite}
          initial={state.initial}
          saving={saving}
          opError={opError}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
