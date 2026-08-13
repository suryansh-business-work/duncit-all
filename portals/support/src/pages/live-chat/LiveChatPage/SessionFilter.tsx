import { DuncitTabs, type DuncitTabItem } from '@duncit/tabs';
import type { SupportChatStatus } from '../../../graphql/supportChat';

/** The strip, as data — LiveChatPage reads the same list to validate the URL. */
export const SESSION_FILTERS: DuncitTabItem<SupportChatStatus>[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Resolved' },
];

interface Props {
  value: SupportChatStatus;
  onChange: (value: SupportChatStatus) => void;
}

/** OPEN / RESOLVED filter for the session list so agents can re-open resolved
 * chats, read feedback and export them (B1). */
export default function SessionFilter({ value, onChange }: Readonly<Props>) {
  return (
    <DuncitTabs
      items={SESSION_FILTERS}
      value={value}
      onChange={onChange}
      variant="fullWidth"
      sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 12, py: 0 } }}
    />
  );
}
