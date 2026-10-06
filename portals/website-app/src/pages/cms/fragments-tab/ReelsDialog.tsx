import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteRow } from '../queries/sites';
import ReelsTab from '../reels-tab/ReelsTab';

interface Props {
  site: CmsSiteRow;
  open: boolean;
  onClose: () => void;
}

/** The Reel Slider component's own content: the reels it plays and the limits shared by every website. */
export default function ReelsDialog({ site, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{t('websiteApp.cms.fragments.manageReels')}</DialogTitle>
      <DialogContent dividers>{open && <ReelsTab site={site} />}</DialogContent>
    </Dialog>
  );
}
