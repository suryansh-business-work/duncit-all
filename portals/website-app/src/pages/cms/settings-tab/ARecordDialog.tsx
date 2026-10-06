import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { SET_CMS_SITE_A_RECORD } from '../queries/dns';
import { cmsErrorMessage } from '../lib/errors';
import { ARecordForm, type ARecordFormOutput } from './a-record-form';

/** Which hostname, and — when repointing — the record's current address and TTL. */
export interface ARecordTarget {
  host: string;
  current: string | null;
  ttl: number | null;
}

interface Props {
  siteId: string;
  target: ARecordTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Adds or repoints an A record through the Tech → Domain GoDaddy service. */
export default function ARecordDialog({ siteId, target, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [setARecord] = useMutation(SET_CMS_SITE_A_RECORD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const save = async (host: string, values: ARecordFormOutput) => {
    setSubmitting(true);
    setError(null);
    try {
      const input = { host, ip: values.ip, ttl: target?.ttl ?? null, current: target?.current ?? null };
      await setARecord({ variables: { siteId, input } });
      notifySuccess(t('websiteApp.cms.dns.saved', { vars: { host } }));
      onSaved();
      close();
    } catch (failure) {
      setError(cmsErrorMessage(failure, t('websiteApp.cms.dns.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={target !== null} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{target?.current ? t('websiteApp.cms.dns.repoint') : t('websiteApp.cms.dns.add')}</DialogTitle>
      <DialogContent dividers>
        {target && (
          <ARecordForm
            host={target.host}
            current={target.current}
            submitting={submitting}
            errorMessage={error}
            onCancel={close}
            onSubmit={(values) => {
              save(target.host, values).catch(() => setError(t('websiteApp.cms.dns.saveFailed')));
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
