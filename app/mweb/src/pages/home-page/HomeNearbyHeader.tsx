import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';

/** "Happening nearby" section title with its "See all" link to the full nearby
 * list. Native twin: HappeningNearbyHeader. */
export default function HomeNearbyHeader({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const { t } = useTranslation();
  return (
    <SectionHeader
      title={t('mweb.home.happeningNearbyTitle')}
      actionLabel={t('mweb.home.seeAll')}
      onAction={onOpen}
    />
  );
}
