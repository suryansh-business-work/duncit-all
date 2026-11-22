import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Card, CardContent, MenuItem, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { buildEngagementSchema, engagementOptions } from './host-engagement.schema';
import type { HostEngagementFormProps, HostEngagementValues } from './host-engagement.types';

/**
 * Where the club admin records how reaching out went: the host's engagement
 * status (configured in Pod Settings) and a note. The server only accepts an
 * active status for a real host of this club; its refusal shows here.
 */
export default function HostEngagementForm({ statuses, value, updatedAt, onSubmit }: Readonly<HostEngagementFormProps>) {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<HostEngagementValues>({
    resolver: zodResolver(buildEngagementSchema(t)),
    defaultValues: value,
  });

  useEffect(() => {
    reset(value);
  }, [value, reset]);

  const submit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  });

  return (
    <Card variant="outlined" data-testid="club-host-engagement">
      <CardContent>
        <Box component="form" noValidate onSubmit={submit}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800 }}>
                {t('clubAdmin.hosts.engagementTitle')}
              </Typography>
              {updatedAt && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('clubAdmin.hosts.lastUpdated', { vars: { date: formatDateTime(updatedAt) } })}
                </Typography>
              )}
            </Box>
            <RhfTextField
              control={control}
              name="status_key"
              select
              label={t('clubAdmin.hosts.statusLabel')}
              slotProps={{ htmlInput: { 'data-testid': 'club-host-engagement-status' } }}
            >
              {engagementOptions(statuses, value.status_key).map((status) => (
                <MenuItem key={status.key} value={status.key}>
                  {status.is_active ? status.label : t('clubAdmin.hosts.retiredStatus', { vars: { label: status.label } })}
                </MenuItem>
              ))}
            </RhfTextField>
            <RhfTextField
              control={control}
              name="note"
              label={t('clubAdmin.hosts.noteLabel')}
              hint={t('clubAdmin.hosts.noteHelper')}
              multiline
              minRows={2}
              slotProps={{ htmlInput: { 'data-testid': 'club-host-engagement-note' } }}
            />
            {err && <Alert severity="error">{err}</Alert>}
            <Box>
              <DuncitButton
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={formState.isSubmitting || !formState.isDirty}
                data-testid="club-host-engagement-save"
              >
                {formState.isSubmitting ? t('clubAdmin.hosts.saving') : t('clubAdmin.hosts.save')}
              </DuncitButton>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
