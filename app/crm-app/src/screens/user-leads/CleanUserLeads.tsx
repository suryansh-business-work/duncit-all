import { useState } from 'react';
import { Text } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { CrmAppCleanUserLeadsDocument } from '@/graphql/userLeads';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/**
 * The portal's "Clean data": removes invalid numbers, duplicates and stray
 * contacts from the WhatsApp leads, after a confirm, and says what it removed.
 */
export function CleanUserLeads({ onCleaned }: Readonly<{ onCleaned: () => void }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const clean = async () => {
    setBusy(true);
    setError(null);
    try {
      const { waCleanData: r } = await gqlRequest(CrmAppCleanUserLeadsDocument);
      setResult(
        t('crmApp.userLeads.cleaned', {
          vars: {
            invalid: r.removed_invalid,
            duplicates: r.removed_duplicates,
            contacts: r.removed_contacts,
            remaining: r.remaining,
          },
        }),
      );
      setOpen(false);
      onCleaned();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DuncitButton
        label={t('crmApp.userLeads.clean')}
        onPress={() => setOpen(true)}
        variant="outline"
        size="sm"
        testID="user-leads-clean"
      />
      {result ? (
        <Text color="$muted" fontSize="$2" role="status" testID="user-leads-cleaned">
          {result}
        </Text>
      ) : null}
      <ConfirmDialog
        open={open}
        title={t('crm.userLeads.cleanLeadData')}
        message={t('crmApp.userLeads.cleanMessage')}
        confirmLabel={t('crmApp.userLeads.clean')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={busy}
        error={error}
        onConfirm={() => fireAndForget(clean(), logs.mobileApp, 'crm-app/CleanUserLeads', 'clean')}
        onCancel={() => setOpen(false)}
        testID="user-leads-clean-dialog"
      />
    </>
  );
}
