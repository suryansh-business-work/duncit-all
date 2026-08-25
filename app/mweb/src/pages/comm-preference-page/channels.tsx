import type { ReactNode } from 'react';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import { type CommChannel } from '@duncit/utils';

/**
 * Channel → its icon and the screen that owns everything about it.
 *
 * The order is `COMM_CHANNELS`', not this map's, so mWeb and the native app
 * cannot list the three in a different order (rule 27).
 */
export const CHANNEL_UI: Record<CommChannel, { icon: ReactNode; to: string }> = {
  EMAIL: { icon: <MarkEmailReadOutlinedIcon color="action" />, to: '/account/mail-preference' },
  WHATSAPP: { icon: <WhatsAppIcon color="action" />, to: '/account/whatsapp-preference' },
  SMS: { icon: <SmsOutlinedIcon color="action" />, to: '/account/sms-preference' },
};

export { COMM_CHANNELS } from '@duncit/utils';
