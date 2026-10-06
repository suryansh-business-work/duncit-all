import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import { DuncitIconButton } from '@duncit/buttons';
import { useEntityPageMeta } from '../../app/pageMeta';
import PageHeader from '../../components/PageHeader';
import { notifyError, notifySuccess } from '../../components/notify';
import PublicReelsSection from '../../components/public-page/PublicReelsSection';
import { useTranslation } from '../../i18n/useTranslation';
import { ROUND_BTN_SX } from '../VenueDetailsPage/venueDetailsHelpers';
import HostPageHeader from './HostPageHeader';
import { HostPageError, HostPageNotFound, HostPageSkeleton } from './HostPageStates';
import HostPodsSection from './HostPodsSection';
import { HOST_PAGE_PROFILE, hostDisplayName, type HostPageProfile } from './queries';

/**
 * The public host page — `/hosts/:handle`, the page behind a host's tracked
 * Duncit link and QR. Open to everyone, signed in or not: who the host is,
 * their pods and their reels. Tapping a pod asks a signed-out visitor to sign
 * in first and then opens it.
 */
export default function HostPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handle = '' } = useParams();
  const { data, loading, error, refetch } = useQuery<{ publicUserProfile: HostPageProfile | null }>(
    HOST_PAGE_PROFILE,
    { variables: { handle }, skip: !handle },
  );
  const profile = data?.publicUserProfile;
  const host = profile?.is_host ? profile : null;
  const name = host ? hostDisplayName(host) : '';
  useEntityPageMeta(name);

  if (loading && !data) return <HostPageSkeleton />;
  if (error) {
    // A failed retry re-renders this state through `error` itself.
    return <HostPageError onRetry={() => refetch().catch(() => undefined)} />;
  }
  if (!host) return <HostPageNotFound />;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.window.location.href);
      notifySuccess(t('publicPage.hostPage.linkCopied'));
    } catch {
      notifyError(t('publicPage.link.copyFailed'));
    }
  };

  const copyButton = (
    <DuncitIconButton
      aria-label={t('publicPage.hostPage.copyLink')}
      title={t('publicPage.hostPage.copyLink')}
      onClick={copyLink}
      sx={ROUND_BTN_SX}
      data-testid="host-page-copy-link"
    >
      <ContentCopyIcon fontSize="small" />
    </DuncitIconButton>
  );

  return (
    <Stack spacing={3} sx={{ pb: 4 }} data-testid="host-page-screen">
      <PageHeader testId="host-page-header" title={name} onBack={() => navigate(-1)} right={copyButton} />
      <HostPageHeader host={host} name={name} />
      <HostPodsSection hostUserId={host.user_id} name={name} />
      <PublicReelsSection hostUserId={host.user_id} />
    </Stack>
  );
}
