import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PublicPageKind } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Skeleton } from '@/components/Skeleton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { PublicPageLinkPanel } from './PublicPageLinkPanel';
import { PublicPageStatsPanel } from './PublicPageStatsPanel';
import { usePublicPage, type PublicPageState } from './usePublicPage';

interface Props {
  kind: PublicPageKind;
  /** The venue id for a VENUE page; ignored for HOST (the signed-in user). */
  refId?: string | null;
  /** The venue or host name — the share message and the download file names. */
  title: string;
}

function CardHeader({ kind, published }: Readonly<{ kind: PublicPageKind; published: boolean }>) {
  const { t } = useTranslation();
  const { accent, success } = useThemeColors();
  const venue = kind === 'VENUE';
  return (
    <XStack gap={12} alignItems="flex-start">
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name="public" size={22} color={accent} />
      </YStack>
      <YStack flex={1} gap={4}>
        <XStack alignItems="center" gap={6} flexWrap="wrap">
          <Text
            testID="public-page-title"
            role="heading"
            fontSize={16}
            fontWeight="600"
            color="$color"
          >
            {venue ? t('publicPage.card.venueTitle') : t('publicPage.card.hostTitle')}
          </Text>
          {published ? (
            <XStack testID="public-page-published" alignItems="center" gap={4}>
              <MaterialIcons name="check-circle" size={14} color={success} />
              <Text fontSize={12} fontWeight="600" color="$success">
                {t('publicPage.card.published')}
              </Text>
            </XStack>
          ) : null}
        </XStack>
        <Text fontSize={13} color="$muted">
          {venue ? t('publicPage.card.venueSubtitle') : t('publicPage.card.hostSubtitle')}
        </Text>
      </YStack>
    </XStack>
  );
}

function CardBody({
  page,
  kind,
  refId,
  title,
}: Readonly<{ page: PublicPageState; kind: PublicPageKind; refId: string | null; title: string }>) {
  const { t } = useTranslation();
  const { insights, isLoading, errorKey } = page;

  if (!insights && isLoading) {
    return (
      <YStack testID="public-page-loading" gap={10} aria-busy>
        <Skeleton height={20} width="60%" />
        <Skeleton height={44} />
        <Skeleton height={120} />
      </YStack>
    );
  }
  if (!insights || errorKey) {
    return (
      <YStack testID="public-page-error" gap={10}>
        <Text role="alert" fontSize={14} color="$danger">
          {t(errorKey ?? 'publicPage.card.loadFailed')}
        </Text>
        <DuncitButton
          testID="public-page-retry"
          label={t('publicPage.card.retry')}
          variant="outline"
          tone="neutral"
          size="sm"
          onPress={page.retry}
        />
      </YStack>
    );
  }
  if (!insights.published || !insights.link) {
    return (
      <YStack gap={10}>
        <PrimaryButton
          testID="public-page-publish"
          label={page.publishing ? t('publicPage.card.publishing') : t('publicPage.card.publish')}
          loading={page.publishing}
          onPress={() => fireAndForget(page.publish())}
        />
        {page.publishErrorKey ? (
          <Text testID="public-page-publish-error" role="alert" fontSize={13} color="$danger">
            {t(page.publishErrorKey)}
          </Text>
        ) : null}
      </YStack>
    );
  }
  return (
    <YStack gap={20}>
      <PublicPageLinkPanel kind={kind} refId={refId} title={title} link={insights.link} />
      <PublicPageStatsPanel
        insights={insights}
        days={page.days}
        onDaysChange={page.setDays}
        refreshing={isLoading}
      />
    </YStack>
  );
}

/**
 * "Publish your venue / host page" for Venue Studio and Host Studio: Publish
 * mints a tracked duncit.com link to a public page; once published the owner
 * gets the link, its QR, a printable A4 poster and the page's tracking
 * numbers. mWeb twin: public-page/PublishPageCard (rule 27, same testIDs).
 */
export function PublishPageCard({ kind, refId = null, title }: Readonly<Props>) {
  const page = usePublicPage(kind, refId);
  return (
    <SurfaceCard testID="public-page-card" gap={16}>
      <CardHeader kind={kind} published={page.insights?.published === true} />
      <CardBody page={page} kind={kind} refId={refId} title={title} />
    </SurfaceCard>
  );
}
