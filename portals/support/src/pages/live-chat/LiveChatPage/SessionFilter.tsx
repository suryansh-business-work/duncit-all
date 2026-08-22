import { DuncitTabs, type DuncitTabItem } from '@duncit/tabs';
import type { SupportChatStatus } from '../../../graphql/supportChat';

import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The strip, as data — LiveChatPage reads the same list to validate the URL.
 *  Labels are copy, so the list is built from the active catalogue; the
 *  VALUES are what the URL is checked against and never change. */
export const sessionFilters = (t: Translate): DuncitTabItem<SupportChatStatus>[] => [
  { value: 'OPEN', label: t('support.chat.filterOpen') },
  { value: 'CLOSED', label: t('support.chat.filterResolved') },
];

interface Props {
  value: SupportChatStatus;
  onChange: (value: SupportChatStatus) => void;
}

/** OPEN / RESOLVED filter for the session list so agents can re-open resolved
 * chats, read feedback and export them (B1). */
export default function SessionFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DuncitTabs
      items={sessionFilters(t)}
      value={value}
      onChange={onChange}
      variant="fullWidth"
      sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 12, py: 0 } }}
    />
  );
}
