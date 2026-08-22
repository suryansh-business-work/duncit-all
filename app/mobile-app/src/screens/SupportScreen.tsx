import { StackScreen } from '@/components/StackScreen';
import { SupportHelpCenter } from '@/components/support';
import { useTranslation } from '@/hooks/useTranslation';

/** Support help center — FAQ-forward hub: search, top FAQs, topics, a real-time
 * chat CTA and the remaining support tools. RN twin of mWeb's SupportHubPage. */
export function SupportScreen() {
  const { t } = useTranslation();
  return (
    <StackScreen title={t('mweb.support.support')} testID="support-screen">
      <SupportHelpCenter />
    </StackScreen>
  );
}
