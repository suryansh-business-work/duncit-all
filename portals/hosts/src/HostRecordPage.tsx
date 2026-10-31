import { useCallback } from 'react';
import { HostDetailsPage, type HostDetailsPageProps } from '@duncit/entity-consoles';
import { BannerKitPanel, PodBannersPanel, useTranslation } from '@duncit/shell';

type HostTabsBuilder = NonNullable<HostDetailsPageProps['extraTabs']>;

/**
 * Hosts → one host, with the host's banner kit — what their pod banners are
 * made from — and Banners for the pods they run next. Tabs of the record,
 * selected through the URL like its own; the server lets a Hosts console
 * editor save any host's kit.
 */
export default function HostRecordPage() {
  const { t } = useTranslation();
  const bannerTabs = useCallback<HostTabsBuilder>(
    (host) => [
      {
        value: 'bannerKit',
        label: t('shell.bannerKit.title'),
        render: () => <BannerKitPanel key={host.id} entity="HOST" mode="console" id={host.id} />,
      },
      {
        value: 'banners',
        label: t('shell.podBanners.title'),
        render: () => <PodBannersPanel key={host.id} filter={{ field: 'host_user_id', value: host.user_id }} />,
      },
    ],
    [t],
  );
  return <HostDetailsPage extraTabs={bannerTabs} />;
}
