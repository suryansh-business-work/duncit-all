import { Stack } from '@mui/material';
import {
  ChangeRequestBoard,
  useTranslation as useChangeRequestTranslation,
} from '@duncit/pod-change-requests';
import PageBackHeader from '../pod-pending-page/PageBackHeader';
import { notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Change Requests, for a partner on their phone.
 *
 * ONE page for all three roles rather than three: a person can be a venue owner
 * AND a host, and the thing they came here for — "what is waiting on me" — is
 * the same list either way. Each studio also embeds the same board scoped to
 * its own role; this is where the notification, the email CTA and the WhatsApp
 * link all land, so it must answer for whoever taps it.
 *
 * The page draws the calm back bar itself (the native screen's StackScreen,
 * rule 27), so the board's own heading is hidden. The tab title comes from the
 * shared route table (server/meta-routes.ts), like every other mWeb route.
 */
export default function ChangeRequestsPage() {
  const { t } = useTranslation();
  // The board's own translator carries the `changeRequest.*` fallback bundle.
  const { t: tBoard } = useChangeRequestTranslation();

  return (
    <Stack spacing={2.5} sx={{ p: 2 }}>
      <PageBackHeader
        title={tBoard('changeRequest.sectionTitle')}
        backLabel={t('mweb.common.goBack')}
      />
      <ChangeRequestBoard hideHeader onChanged={notifySuccess} />
    </Stack>
  );
}
