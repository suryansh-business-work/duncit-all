import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';
import { ChallengeMappingEditor } from '@duncit/challenges';

interface Props {
  open: boolean;
  /** Edit this sub-category directly; when null the admin picks one first. */
  categoryId: string | null;
  categoryLabel?: string;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: AdminCategoryValue = { super_id: '', super_name: '', category_id: '', category_name: '', sub_id: '', sub_name: '' };

export default function MappingDialog({ open, categoryId, categoryLabel, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<AdminCategoryValue>(EMPTY);
  // Tools are chosen per sub-category, so nothing is configured until one is picked.
  const target = categoryId ?? picked.sub_id;
  const close = () => {
    setPicked(EMPTY);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{t('challenge.mapping.dialogTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {categoryId ? (
            <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700 }}>
              {categoryLabel}
            </Typography>
          ) : (
            <AdminCategorySelect
              value={picked}
              onChange={setPicked}
              direction={{ xs: 'column', md: 'row' }}
              hint={t('challenge.mapping.pickHint')}
            />
          )}
          {target ? (
            <ChallengeMappingEditor key={target} categoryId={target} onSaved={onSaved} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('challenge.mapping.pickFirst')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
