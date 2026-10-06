import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { FontValues } from '../design-form/design.types';
import { CustomFontForm, toCustomFont } from './custom-font-form';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (font: FontValues) => void;
}

/** Upload the site's own typeface, one file per weight and style. */
export default function CustomFontDialog({ open, onClose, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('websiteApp.cms.fonts.upload')}</DialogTitle>
      <DialogContent dividers>
        {open && (
          <CustomFontForm
            onCancel={onClose}
            onSubmit={(values) => {
              onAdd(toCustomFont(values));
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
