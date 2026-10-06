import { Alert, Card, CardContent, Chip, Divider, Skeleton, Snackbar, Stack, Typography } from '@mui/material';
import PublicRounded from '@mui/icons-material/PublicRounded';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { publicPageErrorKey, type PublicPageKind } from '@duncit/utils';
import { PublishedLinkPanel } from './PublishedLinkPanel';
import { PublicPageStatsPanel } from './PublicPageStatsPanel';
import { usePublicPage } from './usePublicPage';
import { usePublicPageActions } from './usePublicPageActions';

export interface PublishPageCardProps {
  kind: PublicPageKind;
  /** The venue id for a venue page; a host page is always the signed-in host's own. */
  refId?: string | null;
  /** The venue's or host's name — the QR's alt text and the poster's file name. */
  title: string;
}

function CardHeading({ kind, published }: Readonly<{ kind: PublicPageKind; published: boolean }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <PublicRounded color="primary" aria-hidden />
      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }} data-testid="public-page-title">
            {kind === 'VENUE' ? t('publicPage.card.venueTitle') : t('publicPage.card.hostTitle')}
          </Typography>
          {published && (
            <Chip size="small" color="success" label={t('publicPage.card.published')} data-testid="public-page-published" />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {kind === 'VENUE' ? t('publicPage.card.venueSubtitle') : t('publicPage.card.hostSubtitle')}
        </Typography>
      </Stack>
    </Stack>
  );
}

/**
 * Venue Studio's and Host Studio's "Publish your page" card: publish once, then
 * the tracked link, its QR, the A4 poster and the page's numbers live here.
 */
export function PublishPageCard({ kind, refId, title }: Readonly<PublishPageCardProps>) {
  const { t } = useTranslation();
  const page = usePublicPage(kind, refId);
  const actions = usePublicPageActions({ kind, refId, title });
  const link = page.insights?.link ?? null;

  const body = () => {
    if (page.loading) return <Skeleton variant="rounded" height={120} data-testid="public-page-loading" />;
    if (page.error) {
      return (
        <Alert
          severity="warning"
          data-testid="public-page-error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => page.retry()} data-testid="public-page-retry">
              {t('publicPage.card.retry')}
            </DuncitButton>
          }
        >
          {t(publicPageErrorKey(page.error, 'publicPage.card.loadFailed'))}
        </Alert>
      );
    }
    if (!page.insights?.published || !link) {
      return (
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          {page.publishError && (
            <Alert severity="error" data-testid="public-page-publish-error" sx={{ alignSelf: 'stretch' }}>
              {t(publicPageErrorKey(page.publishError, 'publicPage.card.publishFailed'))}
            </Alert>
          )}
          <DuncitButton
            variant="contained"
            startIcon={<PublicRounded />}
            loading={page.publishing}
            onClick={page.publish}
            data-testid="public-page-publish"
          >
            {page.publishing ? t('publicPage.card.publishing') : t('publicPage.card.publish')}
          </DuncitButton>
        </Stack>
      );
    }
    return (
      <Stack spacing={2.5} divider={<Divider flexItem />}>
        <PublishedLinkPanel
          link={link}
          title={title}
          posterLoading={actions.posterLoading}
          onCopy={() => actions.copyLink(link)}
          onDownloadQr={() => actions.downloadQr(link)}
          onDownloadPoster={actions.downloadPoster}
        />
        <PublicPageStatsPanel insights={page.insights} days={page.days} onDaysChange={page.setDays} />
      </Stack>
    );
  };

  return (
    <Card variant="outlined" data-testid="public-page-card">
      <CardContent>
        <Stack spacing={2}>
          <CardHeading kind={kind} published={Boolean(page.insights?.published)} />
          {body()}
        </Stack>
      </CardContent>
      <Snackbar
        open={Boolean(actions.notice)}
        autoHideDuration={4000}
        onClose={actions.clearNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={actions.notice?.severity ?? 'success'} onClose={actions.clearNotice} variant="filled">
          {actions.notice?.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
