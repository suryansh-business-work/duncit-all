import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { WebsiteContentForm } from './website-content';
import type { WebsiteContentInput } from './website-content';
import { CONTENT_LABELS, type WebsiteContentItem, type WebsitePageType } from './queries';

interface Props {
  open: boolean;
  type: WebsitePageType;
  item: WebsiteContentItem | null;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: WebsiteContentInput) => void;
}

export default function ContentDialog({
  open,
  type,
  item,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const label = CONTENT_LABELS[type].title;
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{item ? `Edit ${label} entry` : `New ${label} entry`}</DialogTitle>
      <DialogContent dividers>
        {open && (
          <WebsiteContentForm
            type={type}
            item={item}
            submitting={submitting}
            errorMessage={errorMessage}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
