import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { useSession, useTranslation } from '@duncit/app-settings';
import { deletionSettingsSchema, type DeletionSettingsValues } from './schema';
import {
  ACCOUNT_DELETION_CRON,
  RUN_DELETION_PURGE_NOW,
  UPDATE_ACCOUNT_DELETION_CRON,
  UPDATE_RETENTION_DAYS,
  type CronSettings,
} from './queries';

/** State, form and the two actions behind AccountDeletionSection. */
export function useAccountDeletionSettings(onToast: (message: string) => void) {
  const { t } = useTranslation();
  const { can } = useSession();
  const confirm = useConfirm();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data, loading, refetch } = useQuery<any>(ACCOUNT_DELETION_CRON, {
    fetchPolicy: 'cache-and-network',
    skip: !can('SUPER_ADMIN'),
  });
  const [saveRetention] = useMutation<any>(UPDATE_RETENTION_DAYS);
  const [saveCron] = useMutation<any>(UPDATE_ACCOUNT_DELETION_CRON);
  const [runNow, { loading: running }] = useMutation<any>(RUN_DELETION_PURGE_NOW);

  const current: CronSettings | undefined = data?.accountDeletionCronSettings;
  const dueCount: number = data?.accountDeletionDueCount ?? 0;

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeletionSettingsValues, any, DeletionSettingsValues>({
    resolver: zodResolver(deletionSettingsSchema) as unknown as Resolver<DeletionSettingsValues, any, DeletionSettingsValues>,
    // `values` rather than `defaultValues`: the card re-seeds from the server
    // whenever the query answers, so a save elsewhere is not overwritten by a
    // form that hydrated once at mount.
    values: current
      ? {
          retention_days: current.retention_days,
          cron_enabled: current.cron_enabled,
          cron_frequency: current.cron_frequency,
          cron_time_of_day: current.cron_time_of_day,
          cron_weekday: current.cron_weekday,
          cron_batch_size: current.cron_batch_size,
        }
      : undefined,
  });

  const enabled = watch('cron_enabled') ?? false;
  const weekly = watch('cron_frequency') === 'WEEKLY';

  const submit = handleSubmit(async (values) => {
    try {
      // Two mutations because they are two promises. The window is one the
      // product already made to everyone waiting; the schedule is an
      // operational knob. The server keeps them apart so one save can never
      // move the other, and only the half that actually changed is sent.
      if (values.retention_days !== current?.retention_days) {
        await saveRetention({ variables: { retention_days: values.retention_days } });
      }
      await saveCron({
        variables: {
          input: {
            cron_enabled: values.cron_enabled,
            cron_frequency: values.cron_frequency,
            cron_time_of_day: values.cron_time_of_day,
            cron_weekday: values.cron_weekday,
            cron_batch_size: values.cron_batch_size,
          },
        },
      });
      await refetch();
      onToast(t('admin.accountDeletion.saved'));
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  });

  const runSweep = async () => {
    const ok = await confirm({
      title: t('admin.accountDeletion.runNowTitle'),
      message: t('admin.accountDeletion.runNowConfirm', { vars: { count: dueCount } }),
      confirmLabel: t('admin.accountDeletion.runNowCta'),
      destructive: true,
    });
    if (!ok) return;
    try {
      const result = await runNow();
      const run = result.data?.runAccountDeletionPurgeNow;
      await refetch();
      onToast(t('admin.accountDeletion.runFinished', { vars: { count: run?.purged ?? 0 } }));
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  };

  return {
    t,
    can,
    historyOpen,
    setHistoryOpen,
    loading,
    running,
    current,
    dueCount,
    control,
    register,
    errors,
    isSubmitting,
    enabled,
    weekly,
    submit,
    runSweep,
  };
}
