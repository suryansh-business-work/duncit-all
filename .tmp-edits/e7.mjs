import { readFileSync, writeFileSync } from 'node:fs';
const p = 'app/mobile-app/src/screens/CommPreferenceScreen.tsx';
let s = readFileSync(p, 'utf8');
const o = `/** Channel → its icon and the screen that owns everything about it. */
const CHANNEL_UI: Record<
  CommChannel,
  { icon: keyof typeof MaterialIcons.glyphMap; screen: keyof RootStackParamList }
> = {
  EMAIL: { icon: 'mark-email-read', screen: 'MailPreference' },
  WHATSAPP: { icon: 'chat', screen: 'WhatsAppPreference' },
  SMS: { icon: 'sms', screen: 'SmsPreference' },
};`;
const n = `/** Channel → the icon it is recognised by. */
const CHANNEL_ICONS: Record<CommChannel, keyof typeof MaterialIcons.glyphMap> = {
  EMAIL: 'mark-email-read',
  WHATSAPP: 'chat',
  SMS: 'sms',
};`;
if (!s.includes(o)) { console.error('map NOT FOUND'); process.exit(1); }
s = s.replace(o, n);

const o2 = `  const open = (channel: CommChannel) => {
    const screen = CHANNEL_UI[channel].screen;
    if (screen === 'MailPreference') navigation.navigate('MailPreference');
    else if (screen === 'WhatsAppPreference') navigation.navigate('WhatsAppPreference');
    else navigation.navigate('SmsPreference');
  };`;
const n2 = `  // A thunk per channel rather than a screen NAME per channel: \`navigate\`
  // is typed per route, so a union of route names does not narrow and the
  // call would need a cast to compile.
  const open: Record<CommChannel, () => void> = {
    EMAIL: () => navigation.navigate('MailPreference'),
    WHATSAPP: () => navigation.navigate('WhatsAppPreference'),
    SMS: () => navigation.navigate('SmsPreference'),
  };`;
if (!s.includes(o2)) { console.error('open NOT FOUND'); process.exit(1); }
s = s.replace(o2, n2);

s = s.replace('icon={CHANNEL_UI[channel].icon}', 'icon={CHANNEL_ICONS[channel]}');
s = s.replace('onPress={() => open(channel)}', 'onPress={open[channel]}');
writeFileSync(p, s);
console.log('ok');
