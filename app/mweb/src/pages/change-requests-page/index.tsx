import { Stack } from '@mui/material';
import { ChangeRequestBoard } from '@duncit/pod-change-requests';
import { notifySuccess } from '../../components/notify';

/**
 * Change Requests, for a partner on their phone.
 *
 * ONE page for all three roles rather than three: a person can be a venue owner
 * AND a host, and the thing they came here for — "what is waiting on me" — is
 * the same list either way. Each studio also embeds the same board scoped to
 * its own role; this is where the notification, the email CTA and the WhatsApp
 * link all land, so it must answer for whoever taps it.
 *
 * The page's tab title comes from the shared route table
 * (server/meta-routes.ts), like every other mWeb route — there is nothing for
 * the component itself to set.
 */
export default function ChangeRequestsPage() {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <ChangeRequestBoard onChanged={notifySuccess} />
    </Stack>
  );
}
