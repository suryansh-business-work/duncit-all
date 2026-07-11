import { StackScreen } from '@/components/StackScreen';
import { SupportHelpCenter } from '@/components/support';

/** Support help center — FAQ-forward hub: search, top FAQs, topics, a real-time
 * chat CTA and the remaining support tools. RN twin of mWeb's SupportHubPage. */
export function SupportScreen() {
  return (
    <StackScreen title="Support" testID="support-screen">
      <SupportHelpCenter />
    </StackScreen>
  );
}
