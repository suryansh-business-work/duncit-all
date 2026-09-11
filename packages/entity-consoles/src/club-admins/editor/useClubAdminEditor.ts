import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { savedRecordPath, useRecordParentPath } from '../../shared/recordPaths';
import {
  ADMIN_CREATE_CLUB_ADMIN,
  APPROVE_CLUB_ADMIN,
  ASSIGN_CLUB_ADMIN_CLUBS,
  CLUB_ADMIN_DETAIL,
  REJECT_CLUB_ADMIN,
  SET_CLUB_ADMIN_ACTIVE,
  SET_CLUB_ADMIN_COMMISSION,
  UPDATE_CLUB_ADMIN,
  type ClubAdminDetail,
} from '../queries';
import { clubAdminToValues, valuesToClubAdminInput } from './mappers';
import { makeClubAdminFormSchema } from './schema';
import { blankClubAdminValues, type ClubAdminFormValues } from './types';

/**
 * Loading, validating and saving one Club Admin record.
 *
 * The server splits these writes across six mutations because six different
 * things happen to a Club Admin, and the split is absorbed here so the admin
 * presses Save once:
 *
 *  - the details (`updateClubAdminProfile`), which everyone who can edit sends;
 *  - the clubs they run (`assignClubAdminClubs`), which live on the CLUB and not
 *    on this record;
 *  - and, for a governor only, the commission, the live switch, and the review
 *    decision — which is `approveClubAdminProfile` / `rejectClubAdminProfile`
 *    rather than a status field, because a decision writes a trail.
 */
export function useClubAdminEditor(clubAdminId: string) {
  const { t } = useTranslation();
  const { canGovern } = useConsoleAccess();
  const navigate = useNavigate();
  const parentPath = useRecordParentPath();
  const isEdit = !!clubAdminId;
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const detailQuery = useQuery<{ clubAdminProfile: ClubAdminDetail | null }>(CLUB_ADMIN_DETAIL, {
    variables: { id: clubAdminId },
    skip: !isEdit,
    fetchPolicy: 'network-only',
  });
  const admin = detailQuery.data?.clubAdminProfile ?? null;

  const initialValues = useMemo<ClubAdminFormValues>(
    () => (admin ? clubAdminToValues(admin) : blankClubAdminValues),
    [admin],
  );

  const schema = useMemo(() => makeClubAdminFormSchema(t), [t]);
  const form = useForm<ClubAdminFormValues, unknown, ClubAdminFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<
      ClubAdminFormValues,
      unknown,
      ClubAdminFormValues
    >,
    values: initialValues,
    mode: 'onBlur',
  });

  const [createAdmin] = useMutation(ADMIN_CREATE_CLUB_ADMIN);
  const [updateAdmin] = useMutation(UPDATE_CLUB_ADMIN);
  const [assignClubs] = useMutation(ASSIGN_CLUB_ADMIN_CLUBS);
  const [setCommission] = useMutation(SET_CLUB_ADMIN_COMMISSION);
  const [setActive] = useMutation(SET_CLUB_ADMIN_ACTIVE);
  const [approve] = useMutation(APPROVE_CLUB_ADMIN);
  const [reject] = useMutation(REJECT_CLUB_ADMIN);

  /**
   * The review decision, when it MOVED.
   *
   * A status is not a field on this record: APPROVED and REJECTED are the two
   * mutations that write the decision, its timestamp and — for a rejection — the
   * reason. Re-sending the status it already holds would re-approve somebody and
   * re-send their email, so nothing is sent when it did not change.
   */
  const applyDecision = useCallback(
    async (id: string, values: ClubAdminFormValues, was: ClubAdminFormValues['status']) => {
      if (values.status === was) return;
      if (values.status === 'APPROVED') {
        await approve({ variables: { id, notes: null } });
        return;
      }
      if (values.status === 'REJECTED') {
        await reject({ variables: { id, notes: t('directory.clubAdminEditor.rejectedFromConsole') } });
      }
    },
    [approve, reject, t],
  );

  const submit = useCallback(
    async (values: ClubAdminFormValues) => {
      setBusy(true);
      setSaveError(null);
      try {
        const input = valuesToClubAdminInput(values, canGovern);
        let id = values.id;
        if (isEdit) {
          await updateAdmin({ variables: { id, input } });
        } else {
          const created = await createAdmin({ variables: { user_id: values.user_id, input } });
          id =
            (created.data as { adminCreateClubAdminProfile?: { id: string } } | null)
              ?.adminCreateClubAdminProfile?.id ?? '';
        }
        if (!id) throw new Error(t('directory.clubAdminEditor.errNoId'));

        await assignClubs({ variables: { id, club_ids: values.club_ids } });

        if (canGovern) {
          await setCommission({
            variables: { id, commission_pct: values.commission_pct || null },
          });
          await applyDecision(id, values, admin?.status ?? 'DRAFT');
          if (values.is_active !== (admin?.is_active ?? true)) {
            await setActive({ variables: { id, is_active: values.is_active } });
          }
        }
        notifySuccess(
          isEdit
            ? t('directory.clubAdminEditor.saved')
            : t('directory.clubAdminEditor.created'),
        );
        navigate(savedRecordPath(parentPath, isEdit, id));
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [
      admin?.is_active,
      admin?.status,
      applyDecision,
      assignClubs,
      canGovern,
      createAdmin,
      isEdit,
      navigate,
      parentPath,
      setActive,
      setCommission,
      t,
      updateAdmin,
    ],
  );

  return {
    form,
    admin,
    isEdit,
    canGovern,
    busy,
    saveError,
    loading: detailQuery.loading && !admin,
    error: detailQuery.error,
    submit,
  };
}
