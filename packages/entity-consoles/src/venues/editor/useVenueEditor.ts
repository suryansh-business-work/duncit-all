import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { VENUE_DETAIL, type AdminVenueDetail } from '../detail/queries';
import {
  ADMIN_CREATE_VENUE,
  ADMIN_UPDATE_VENUE,
  SET_VENUE_ACTIVE,
  SET_VENUE_DEDUCTIONS,
  UPDATE_VENUE_SETTINGS,
  VENUE_REGISTRATION_CONFIG,
  type VenueRegistrationConfig,
} from './queries';
import {
  valuesToSettingsInput,
  valuesToStep1,
  valuesToStep2,
  valuesToStep3,
  venueToValues,
} from './mappers';
import { makeVenueFormSchema } from './schema';
import { blankVenueValues, type VenueFormValues } from './types';

/**
 * Loading, validating and saving one venue.
 *
 * The server splits a venue's writes across four mutations, and this is where
 * that split is absorbed: the admin presses Save once and this runs the record,
 * the settings and the deductions in order. The active switch is the exception —
 * `setVenueActive` emails the owner, so it is only called when the value
 * actually moved.
 */

const EMPTY_CONFIG: VenueRegistrationConfig = {
  venue_types: [],
  doc_types: [],
  capacity_item_limit: 50,
  amenities: [],
  facilities: [],
  security: [],
};

export function useVenueEditor(venueId: string) {
  const { t } = useTranslation();
  const { canGovern } = useConsoleAccess();
  const navigate = useNavigate();
  const isEdit = !!venueId;
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const venueQuery = useQuery<{ venue: AdminVenueDetail | null }>(VENUE_DETAIL, {
    variables: { venue_doc_id: venueId },
    skip: !isEdit,
    fetchPolicy: 'network-only',
  });
  const venue = venueQuery.data?.venue ?? null;

  const configQuery = useQuery<{ venueRegistrationConfig: VenueRegistrationConfig }>(
    VENUE_REGISTRATION_CONFIG,
  );
  const config = configQuery.data?.venueRegistrationConfig ?? EMPTY_CONFIG;

  const initialValues = useMemo<VenueFormValues>(
    () => (venue ? venueToValues(venue) : blankVenueValues),
    [venue],
  );

  // Rebuilt when the language changes, because its messages are copy.
  const schema = useMemo(() => makeVenueFormSchema(t), [t]);

  // The third generic pins the SUBMITTED shape to the form's own: the schema's
  // `.default()`s make Zod's INPUT type wider than its output, and without this
  // every `control` handed to a section widens to `FieldValues` (the house
  // spelling — see @duncit/club-form and @duncit/pod-form).
  const form = useForm<VenueFormValues, unknown, VenueFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<
      VenueFormValues,
      unknown,
      VenueFormValues
    >,
    values: initialValues,
    mode: 'onBlur',
  });

  const [createVenue] = useMutation(ADMIN_CREATE_VENUE);
  const [updateVenue] = useMutation(ADMIN_UPDATE_VENUE);
  const [updateSettings] = useMutation(UPDATE_VENUE_SETTINGS);
  const [setDeductions] = useMutation(SET_VENUE_DEDUCTIONS);
  const [setActive] = useMutation(SET_VENUE_ACTIVE);

  /**
   * The writes that follow the record itself.
   *
   * The settings are DETAILS, so everyone who can edit sends them. The
   * percentages and the live switch are GOVERNANCE: a viewer holding only the
   * console's access role would be refused by the server, so the request is not
   * made rather than made and failed (see `useConsoleAccess`).
   */
  const applyRest = useCallback(
    async (id: string, values: VenueFormValues, wasActive: boolean) => {
      await updateSettings({
        variables: { venue_doc_id: id, input: valuesToSettingsInput(values) },
      });
      if (!canGovern) return;
      await setDeductions({
        variables: {
          venue_doc_id: id,
          venue_share_pct: values.venue_share_pct,
          venue_commission_pct: values.venue_commission_pct,
        },
      });
      if (values.is_active !== wasActive) {
        await setActive({ variables: { venue_doc_id: id, active: values.is_active } });
      }
    },
    [canGovern, setActive, setDeductions, updateSettings],
  );

  const submit = useCallback(
    async (values: VenueFormValues) => {
      setBusy(true);
      setSaveError(null);
      try {
        const payload = {
          step1: valuesToStep1(values),
          step2: valuesToStep2(values),
          step3: valuesToStep3(values),
        };
        let id = values.id;
        if (isEdit) {
          await updateVenue({
            variables: {
              venue_doc_id: id,
              ...payload,
              // Omitted rather than sent unchanged: the server refuses a status
              // from a caller who cannot govern, even one that did not move.
              status: canGovern ? values.status : undefined,
            },
          });
        } else {
          const created = await createVenue({
            variables: {
              owner_user_id: values.owner_user_id,
              ...payload,
              submit: canGovern && values.status !== 'DRAFT',
            },
          });
          id = (created.data as { adminCreateVenue?: { id: string } } | null)?.adminCreateVenue?.id ?? '';
        }
        if (!id) throw new Error(t('directory.venueEditor.errNoId'));
        // A brand-new venue is created active, so only an admin who turned the
        // switch off in the form triggers the notification.
        await applyRest(id, values, venue?.is_active ?? true);
        notifySuccess(
          isEdit ? t('directory.venueEditor.saved') : t('directory.venueEditor.created'),
        );
        navigate(`/venues/${id}`);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [applyRest, canGovern, createVenue, isEdit, navigate, t, updateVenue, venue?.is_active],
  );

  return {
    form,
    config,
    venue,
    isEdit,
    canGovern,
    busy,
    saveError,
    loading: venueQuery.loading && !venue,
    error: venueQuery.error,
    submit,
  };
}
