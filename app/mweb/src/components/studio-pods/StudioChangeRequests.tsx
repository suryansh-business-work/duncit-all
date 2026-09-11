import { Card, CardContent, Stack } from '@mui/material';
import {
  ChangeRequestBoard,
  useTranslation as useChangeRequestTranslation,
} from '@duncit/pod-change-requests';
import type { PodChangeRole } from '@duncit/utils';
import { notifySuccess } from '../notify';
import SectionHeader from '../SectionHeader';

/**
 * The Change Requests section a partner studio shows, in that studio's card
 * chrome.
 *
 * ONE component for all three studios: the board itself is shared with the
 * Partners console, and what a studio adds is the card around it and the role
 * to scope it to — so a venue owner is never shown a host's request, and three
 * copies of the same four lines never drift (rules 27/34/40). The card draws
 * the section title itself, so the board's own heading (and its subtitle) is
 * hidden — the native twin reads the same.
 */
export default function StudioChangeRequests({ role }: Readonly<{ role: PodChangeRole }>) {
  // The board's own translator carries the `changeRequest.*` fallback bundle.
  const { t } = useChangeRequestTranslation();
  return (
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={2}>
          <SectionHeader title={t('changeRequest.sectionTitle')} />
          <ChangeRequestBoard role={role} hideHeader onChanged={notifySuccess} />
        </Stack>
      </CardContent>
    </Card>
  );
}
