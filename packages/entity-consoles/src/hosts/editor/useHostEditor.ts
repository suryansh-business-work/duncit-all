import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { podRequestOverrideInput } from '../../shared/podRequestLimit';
import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { savedRecordPath, useRecordParentPath } from '../../shared/recordPaths';
import {
  ADMIN_CREATE_HOST,
  ADMIN_UPDATE_HOST,
  HOST_DETAIL,
  SET_HOST_ACTIVE,
  SET_HOST_DEDUCTIONS,
  SET_HOST_VENUE_REQUEST_LIMIT,
  type HostDetail,
} from '../queries';
import {
  hostToValues,
  valuesToHostCategories,
  valuesToHostStep1,
  valuesToHostStep2,
  valuesToHostStep3,
} from './mappers';
import { makeHostFormSchema } from './schema';
import { blankHostValues, type HostFormValues } from './types';

/**
 * Loading, validating and saving one host.
 *
 * Three writes, in this order: the record (which also carries the status and the
 * categories), then the commission — which lives on the host's USER account, not
 * on the host record, so it is `setHostDeductions(user_id)` and not part of
 * `adminUpdateHost` — and finally the live switch, only when it actually moved.
 */
export function useHostEditor(hostId: string) {
  const { t } = useTranslation();
  const { canGovern } = useConsoleAccess();
  const navigate = useNavigate();
  const parentPath = useRecordParentPath();
  const isEdit = !!hostId;
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hostQuery = useQuery<{ host: HostDetail | null }>(HOST_DETAIL, {
    variables: { host_doc_id: hostId },
    skip: !isEdit,
    fetchPolicy: 'network-only',
  });
  const host = hostQuery.data?.host ?? null;

  const initialValues = useMemo<HostFormValues>(
    () => (host ? hostToValues(host) : blankHostValues),
    [host],
  );

  const schema = useMemo(() => makeHostFormSchema(t), [t]);
  const form = useForm<HostFormValues, unknown, HostFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<HostFormValues, unknown, HostFormValues>,
    values: initialValues,
    mode: 'onBlur',
  });

  const [createHost] = useMutation(ADMIN_CREATE_HOST);
  const [updateHost] = useMutation(ADMIN_UPDATE_HOST);
  const [setActive] = useMutation(SET_HOST_ACTIVE);
  const [setDeductions] = useMutation(SET_HOST_DEDUCTIONS);
  const [setRequestLimit] = useMutation(SET_HOST_VENUE_REQUEST_LIMIT);

  /**
   * The governance writes, in order: the commission, then the live switch and
   * the Pod Request override — each of those two only when it actually moved
   * (setHostActive notifies; a new host record is created active).
   */
  const applyGovernance = useCallback(
    async (id: string, values: HostFormValues) => {
      await setDeductions({
        variables: { user_id: values.user_id, host_commission_pct: values.host_commission_pct },
      });
      if (values.is_active !== (host?.is_active ?? true)) {
        await setActive({ variables: { host_doc_id: id, active: values.is_active } });
      }
      const limit = podRequestOverrideInput(t, values.venue_requests_limit_override);
      if (limit !== (host?.venue_requests_limit_override ?? null)) {
        await setRequestLimit({ variables: { host_doc_id: id, limit } });
      }
    },
    [host?.is_active, host?.venue_requests_limit_override, setActive, setDeductions, setRequestLimit, t],
  );

  const submit = useCallback(
    async (values: HostFormValues) => {
      setBusy(true);
      setSaveError(null);
      try {
        const payload = {
          step1: valuesToHostStep1(values),
          step2: valuesToHostStep2(values),
          step3: valuesToHostStep3(values),
        };
        const categories = valuesToHostCategories(values);
        // Omitted rather than sent: the server refuses a status from a
        // caller who cannot govern, even one that did not move.
        const status = canGovern ? values.status : undefined;
        let id = values.id;
        if (isEdit) {
          await updateHost({
            variables: { host_doc_id: id, ...payload, status, categories },
          });
        } else {
          const created = await createHost({
            variables: {
              target_user_id: values.user_id,
              ...payload,
              submit: canGovern && values.status !== 'DRAFT',
            },
          });
          id =
            (created.data as { adminCreateHost?: { id: string } } | null)?.adminCreateHost?.id ?? '';
          if (id && categories.length > 0) {
            await updateHost({
              variables: { host_doc_id: id, ...payload, status, categories },
            });
          }
        }
        if (!id) throw new Error(t('directory.hostEditor.errNoId'));
        // The commission and the live switch are GOVERNANCE: a console-role
        // editor would be refused, so the request is never made.
        if (canGovern) await applyGovernance(id, values);
        notifySuccess(isEdit ? t('directory.hostEditor.saved') : t('directory.hostEditor.created'));
        navigate(savedRecordPath(parentPath, isEdit, id));
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [
      applyGovernance,
      canGovern,
      createHost,
      isEdit,
      navigate,
      parentPath,
      t,
      updateHost,
    ],
  );

  return {
    form,
    host,
    isEdit,
    canGovern,
    busy,
    saveError,
    loading: hostQuery.loading && !host,
    error: hostQuery.error,
    submit,
  };
}
