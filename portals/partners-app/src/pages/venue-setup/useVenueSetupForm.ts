import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import {
  blankRegisterVenueValues,
  categoryLimitOf,
  foodLimitsOf,
  registerVenueSchema,
  SECTION_FIELDS,
  taxDocTypesOf,
  toSetupInput,
  venueToValues,
  type RegisterVenueMode,
  type RegisterVenueValues,
  type SetupSectionKey,
  type VenueRegistrationConfig,
} from '../register-venue-page/register-venue';
import { MY_VENUE, REGISTRATION_CONFIG } from '../register-venue-page/queries';
import { UPDATE_VENUE_SETUP } from './queries';

interface VenueRecord {
  id: string;
  status: string;
  owner_name?: string | null;
  venue_name?: string | null;
  gstin?: string | null;
  food_tables?: string[] | null;
}

interface VenueQueryData {
  me?: { email?: string | null } | null;
  myVenue?: VenueRecord | null;
}

/**
 * One Venue Options setup page's form: the venue as the registration form's
 * values (so the page mounts the very section the form used to show), checked
 * with the setup rules, and saved through `updateVenueSetup` — any status,
 * only the page's own fields.
 */
export function useVenueSetupForm(venueId: string, section: SetupSectionKey) {
  const { t } = useTranslation();
  const venueQuery = useQuery<VenueQueryData>(MY_VENUE, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const configQuery = useQuery<{ venueRegistrationConfig: VenueRegistrationConfig }>(REGISTRATION_CONFIG);
  const config = configQuery.data?.venueRegistrationConfig ?? null;
  const venue = venueQuery.data?.myVenue ?? null;
  const accountEmail = venueQuery.data?.me?.email ?? '';
  const [error, setError] = useState<string | null>(null);
  const [save, saveState] = useMutation(UPDATE_VENUE_SETUP);

  const schema = useMemo(
    () =>
      config
        ? registerVenueSchema(t, taxDocTypesOf(config), foodLimitsOf(config), categoryLimitOf(config), 'setup')
        : registerVenueSchema(t, undefined, undefined, undefined, 'setup'),
    [t, config],
  );
  const form = useForm<RegisterVenueValues>({
    resolver: zodResolver(schema) as unknown as Resolver<RegisterVenueValues>,
    defaultValues: blankRegisterVenueValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (venue) form.reset(venueToValues(venue, [], { name: venue.owner_name ?? '', email: accountEmail }));
  }, [venue, accountEmail, form]);

  const mode: RegisterVenueMode = venue?.status === 'APPROVED' ? 'edit-approved' : 'register';

  const submit = async () => {
    setError(null);
    const ok = await form.trigger(SECTION_FIELDS[section], { shouldFocus: true });
    if (!ok) return;
    try {
      const input = toSetupInput(section, form.getValues(), { withMenu: mode !== 'edit-approved' });
      await save({ variables: { venue_id: venueId, input } });
      await venueQuery.refetch();
      notifySuccess(t('partners.venueSetup.saved'));
    } catch (saveError) {
      setError(parseApiError(saveError) || t('partners.venueSetup.saveFailed'));
      logs.portal['partners-app'].warn('venue-setup', 'save', { error: saveError, venue_id: venueId, section });
    }
  };

  return {
    form,
    config,
    venue,
    mode,
    loading: (venueQuery.loading && !venue) || (configQuery.loading && !config),
    loadError: venueQuery.error ?? configQuery.error ?? null,
    submit,
    saving: saveState.loading,
    error,
  };
}

export type VenueSetupForm = ReturnType<typeof useVenueSetupForm>;
