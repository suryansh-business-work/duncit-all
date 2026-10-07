import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { RequestLimitForm } from '../../components/request-limit';
import { SET_HOST_VENUE_REQUEST_LIMIT, type HostRow } from './queries';

interface Props {
  host: Pick<HostRow, 'id' | 'venue_requests_limit_override'>;
  /** Refresh the table behind the dialog once the limit is saved. */
  onSaved: () => void;
}

/**
 * "Maximum Venue Requests / Month" for this host — set by admins only, at
 * onboarding (Review and Edit dialogs) or later in the Hosts portal. Saves on
 * its own button through `setHostVenueRequestLimit`.
 */
export default function HostRequestLimitPanel({ host, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [setLimit, state] = useMutation(SET_HOST_VENUE_REQUEST_LIMIT);

  const save = async (limit: number | null) => {
    await setLimit({ variables: { id: host.id, limit } });
    onSaved();
  };

  return (
    <RequestLimitForm
      label={t('podRequests.hostLimitLabel')}
      limit={host.venue_requests_limit_override}
      saving={state.loading}
      onSave={save}
      testId="host-request-limit"
    />
  );
}
