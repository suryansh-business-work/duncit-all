import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';
import { gigInterestDefaults, makeGigInterestSchema } from '@duncit/forms/schemas';
import { parseApiError, type GigJob } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { ExpressGigInterestDocument } from '@/graphql/gigs';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ContactSharingNotice } from './GigNote';

interface Props {
  job: GigJob;
  open: boolean;
  onClose: () => void;
  /** The gig as the server answers after the swap — now carrying the poster's contact. */
  onShared: (job: GigJob) => void;
}

/**
 * "I'm interested": an optional note, then contacts are swapped. The server
 * makes a repeat a no-op, so a retry cannot share or notify twice.
 * mWeb twin: @duncit/gig-jobs InterestDialog.
 */
export function InterestSheet({ job, open, onClose, onShared }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const schema = useMemo(() => makeGigInterestSchema(t), [t]);
  const { control, handleSubmit } = useForm({
    defaultValues: gigInterestDefaults,
    resolver: zodResolver(schema),
  });

  const submit = handleSubmit(async ({ message }) => {
    setBusy(true);
    setApiError(null);
    try {
      const res = await graphqlRequest(
        ExpressGigInterestDocument,
        { job_id: job.id, message },
        { auth: true },
      );
      onShared(res.expressGigInterest);
      onClose();
    } catch (error) {
      setApiError(parseApiError(error, t('gigJobs.interest.failed')));
    } finally {
      setBusy(false);
    }
  });

  return (
    <DuncitDialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      testID="gig-interest-sheet"
      title={t('gigJobs.interest.dialogTitle', { vars: { name: job.poster_name } })}
      closeLabel={t('gigJobs.form.cancel')}
      dismissOnBackdrop={!busy}
      footer={
        <ConfirmFooter
          cancelLabel={t('gigJobs.form.cancel')}
          confirmLabel={t('gigJobs.interest.confirm')}
          busy={busy}
          destructive={false}
          cancelTestID="gig-interest-cancel"
          confirmTestID="gig-interest-submit"
          onCancel={onClose}
          onConfirm={() => fireAndForget(submit())}
        />
      }
    >
      <YStack gap={12}>
        <Text fontSize={13.5} color="$color">
          {t('gigJobs.interest.dialogBody')}
        </Text>
        {apiError ? (
          <Text role="alert" fontSize={13} color="$danger">
            {apiError}
          </Text>
        ) : null}
        <FormTextField
          control={control}
          name="message"
          label={t('gigJobs.interest.messageLabel')}
          placeholder={t('gigJobs.interest.messagePlaceholder')}
          multiline
        />
        <ContactSharingNotice />
      </YStack>
    </DuncitDialog>
  );
}
