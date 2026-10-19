import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  gigCategoryToValues,
  makeGigCategorySchema,
  type GigCategoryFormValues,
  type GigCategoryRow,
} from './gig-category';

interface Props {
  open: boolean;
  editing: GigCategoryRow | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: GigCategoryFormValues) => Promise<void>;
}

const TITLE_ID = 'gig-category-dialog-title';

/** Create or edit one gig category and the roles under it. */
export default function GigCategoryFormDialog({ open, editing, loading, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeGigCategorySchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<GigCategoryFormValues>({
    defaultValues: gigCategoryToValues(editing),
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(gigCategoryToValues(editing));
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle id={TITLE_ID}>{editing ? t('gigJobs.admin.edit') : t('gigJobs.admin.new')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <RhfTextField control={control} name="title" label={t('gigJobs.admin.fieldTitle')} />
            <RhfTextField control={control} name="description" label={t('gigJobs.admin.fieldDescription')} multiline minRows={2} />
            <RhfTextField
              control={control}
              name="examples"
              label={t('gigJobs.admin.fieldExamples')}
              hint={t('gigJobs.admin.fieldExamplesHint')}
              multiline
              minRows={5}
            />
            <RhfTextField
              control={control}
              name="sort_order"
              label={t('gigJobs.admin.fieldOrder')}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                  label={t('gigJobs.admin.fieldActive')}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={loading}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={loading} disabled={loading}>
            {t('shell.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
