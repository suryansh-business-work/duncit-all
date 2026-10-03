import { Stack } from '@mui/material';
import { MailPreferencesCard } from './MailPreferencesCard';
import { OtpChannelsCard } from './OtpChannelsCard';
import { WhatsAppPreferencesCard } from './WhatsAppPreferencesCard';

/** What Duncit sends this account, per channel, and where its codes go. */
export function NotificationsTab() {
  return (
    <Stack spacing={2}>
      <MailPreferencesCard />
      <WhatsAppPreferencesCard />
      <OtpChannelsCard />
    </Stack>
  );
}
