import { Card, CardContent } from '@mui/material';
import { ChangeRequestBoard } from '@duncit/pod-change-requests';
import type { PodChangeRole } from '@duncit/utils';
import { notifySuccess } from '../notify';

/**
 * The Change Requests section a partner studio shows, in that studio's card
 * chrome.
 *
 * ONE component for all three studios: the board itself is shared with the
 * Partners console, and what a studio adds is the card around it and the role
 * to scope it to — so a venue owner is never shown a host's request, and three
 * copies of the same four lines never drift (rules 27/34/40).
 */
export default function StudioChangeRequests({ role }: Readonly<{ role: PodChangeRole }>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <ChangeRequestBoard role={role} onChanged={notifySuccess} />
      </CardContent>
    </Card>
  );
}
