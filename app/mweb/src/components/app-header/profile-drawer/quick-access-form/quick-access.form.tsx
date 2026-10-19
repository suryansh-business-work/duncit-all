import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { makeQuickAccessSchema } from '@duncit/forms/schemas';
import {
  DEFAULT_QUICK_ACCESS,
  QUICK_ACCESS_SIZE,
  moveQuickAccess,
  quickAccessEditorRows,
  toggleQuickAccess,
  type ProfileMenuKey,
} from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import { menuEntry } from '../profileSections';
import QuickAccessOption from './QuickAccessOption';
import type { QuickAccessFormProps, QuickAccessFormValues } from './quick-access.types';

/**
 * "Edit Quick Access" — a small dialog where the member picks which six
 * destinations the grid shows and in what order. A pick only lands on Save.
 * The parent remounts it on every opening, so each opening starts on the grid
 * as it is. Native twin: Sidebar/SidebarQuickAccessEditor.
 */
export default function QuickAccessForm({ open, current, flags, saveFailed, onClose, onSave }: Readonly<QuickAccessFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeQuickAccessSchema(t, flags), [t, flags]);
  const { control, handleSubmit, setValue, formState } = useForm<QuickAccessFormValues, unknown, QuickAccessFormValues>({
    defaultValues: { selection: [...current] },
    resolver: zodResolver(schema) as unknown as Resolver<QuickAccessFormValues, unknown, QuickAccessFormValues>,
  });
  const selection = useWatch({ control, name: 'selection' });

  const update = (next: ProfileMenuKey[]) =>
    setValue('selection', next, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const full = selection.length >= QUICK_ACCESS_SIZE;
  const error = formState.errors.selection?.message;

  return (
    <Dialog data-testid="quick-access-editor" open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="quick-access-title" aria-describedby="quick-access-hint">
      <Box component="form" noValidate onSubmit={handleSubmit((values) => onSave(values.selection))}>
        <DialogTitle id="quick-access-title" sx={{ pb: 0.5 }}>
          {t('mweb.sidebar.editQuickAccess')}
        </DialogTitle>
        <DialogContent>
          <Typography id="quick-access-hint" sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t('mweb.sidebar.editorHint', { vars: { max: QUICK_ACCESS_SIZE } })}
          </Typography>
          <Typography data-testid="quick-access-count" aria-live="polite" sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mt: 1 }}>
            {t('mweb.sidebar.editorCount', { vars: { selected: selection.length, max: QUICK_ACCESS_SIZE } })}
          </Typography>
          {error ? (
            <Alert data-testid="quick-access-error" severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          ) : null}
          {saveFailed ? (
            <Alert data-testid="quick-access-save-failed" severity="warning" sx={{ mt: 1 }}>
              {t('mweb.sidebar.editorSaveFailed')}
            </Alert>
          ) : null}
          <Box sx={{ mt: 1 }}>
            {quickAccessEditorRows(selection, flags).map((key) => {
              const index = selection.indexOf(key);
              return (
                <QuickAccessOption
                  key={key}
                  entry={menuEntry(key, t)}
                  index={index}
                  picked={index >= 0}
                  pickedCount={selection.length}
                  full={full}
                  onToggle={() => update(toggleQuickAccess(selection, key))}
                  onMove={(step) => update(moveQuickAccess(selection, index, step))}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <DuncitButton data-testid="quick-access-reset" variant="outlined" onClick={() => update([...DEFAULT_QUICK_ACCESS])}>
            {t('mweb.sidebar.editorReset')}
          </DuncitButton>
          <DuncitButton data-testid="quick-access-save" type="submit" variant="contained">
            {t('mweb.sidebar.editorSave')}
          </DuncitButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
