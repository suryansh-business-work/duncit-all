import { Tab, Tabs } from '@mui/material';
import type { SupportChatStatus } from '../../../graphql/supportChat';

interface Props {
  value: SupportChatStatus;
  onChange: (value: SupportChatStatus) => void;
}

/** OPEN / RESOLVED filter for the session list so agents can re-open resolved
 * chats, read feedback and export them (B1). */
export default function SessionFilter({ value, onChange }: Readonly<Props>) {
  return (
    <Tabs
      value={value}
      onChange={(_e, v: SupportChatStatus) => onChange(v)}
      variant="fullWidth"
      sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 12, py: 0 } }}
    >
      <Tab value="OPEN" label="Open" />
      <Tab value="CLOSED" label="Resolved" />
    </Tabs>
  );
}
