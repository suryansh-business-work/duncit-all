import { PillTabs, type PillTab } from '@/components/PillTabs';
import { useTranslation } from '@/hooks/useTranslation';

export type ChatTab = 'PODS' | 'CLUBS';

const TABS: readonly PillTab<ChatTab>[] = [
  { key: 'PODS', labelKey: 'mweb.chat.tabPods' },
  { key: 'CLUBS', labelKey: 'mweb.chat.tabClubs' },
];

/** Pods | Clubs — the pill strip over the Chats screen. Twin of mWeb's
 * DuncitTabs on ChatsPage (rule 27). */
export function ChatTabs({
  value,
  onChange,
}: Readonly<{ value: ChatTab; onChange: (tab: ChatTab) => void }>) {
  const { t } = useTranslation();
  return (
    <PillTabs
      tabs={TABS}
      value={value}
      onChange={onChange}
      ariaLabel={t('mweb.nav.chats')}
      testIDPrefix="chat-tab"
    />
  );
}
