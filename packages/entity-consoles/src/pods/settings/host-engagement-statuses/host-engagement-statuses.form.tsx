import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { MAX_HOST_ENGAGEMENT_STATUSES } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import StatusRow from './StatusRow';
import { buildStatusesSchema, toStatusesInput } from './host-engagement-statuses.schema';
import type { HostEngagementStatusesFormProps, HostEngagementStatusesValues } from './host-engagement-statuses.types';

/**
 * Pod Settings > Engagement statuses — the list a Club Admin files a host
 * under. Labels and order are editable; a saved status can only be switched
 * off, never deleted (the server keeps its key so hosts filed under it keep
 * their status). Rows added here can be removed until they are saved.
 */
export default function HostEngagementStatusesForm({ value, loading, onSave }: Readonly<HostEngagementStatusesFormProps>) {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<HostEngagementStatusesValues>({
    resolver: zodResolver(buildStatusesSchema(t)),
    defaultValues: { statuses: [] },
  });
  const { fields, append, move, remove } = useFieldArray({ control, name: 'statuses' });

  useEffect(() => {
    if (value) reset({ statuses: value.map((row) => ({ ...row })) });
  }, [value, reset]);

  const submit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await onSave(toStatusesInput(values));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  });

  const listError = formState.errors.statuses?.root?.message ?? formState.errors.statuses?.message;

  return (
    <Card data-testid="pod-settings-host-statuses">
      <CardContent>
        <Box component="form" noValidate onSubmit={submit}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1">{t('admin.podSettings.hostEngagement.statusesTitle')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('admin.podSettings.hostEngagement.statusesDesc')}
              </Typography>
            </Box>
            {fields.map((field, index) => (
              <StatusRow
                key={field.id}
                control={control}
                index={index}
                count={fields.length}
                savedKey={field.key}
                onMove={move}
                onRemove={remove}
              />
            ))}
            {listError && <Alert severity="warning">{listError}</Alert>}
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <DuncitButton
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={loading || fields.length >= MAX_HOST_ENGAGEMENT_STATUSES}
                onClick={() => append({ key: '', label: '', is_active: true })}
                data-testid="pod-settings-host-statuses-add"
              >
                {t('admin.podSettings.hostEngagement.addStatus')}
              </DuncitButton>
              <DuncitButton
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={loading || !value || formState.isSubmitting || !formState.isDirty}
                data-testid="pod-settings-host-statuses-save"
              >
                {formState.isSubmitting
                  ? t('admin.podSettings.hostEngagement.saving')
                  : t('admin.podSettings.hostEngagement.saveStatuses')}
              </DuncitButton>
            </Stack>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
