import ChatIcon from '@mui/icons-material/Chat';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  club: any;
}

export default function ClubSocialLinks({ club }: Readonly<Props>) {
  const { t } = useTranslation();
  const social = [
    { label: t('mweb.common.community'), href: club.club_whats_app_community_link, icon: <WhatsAppIcon /> },
    { label: t('mweb.common.groupChat'), href: club.club_whats_app_group_link, icon: <ChatIcon /> },
  ].filter((item) => item.href);

  if (social.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {social.map((item) => (
        <DuncitButton
          key={item.label}
          startIcon={item.icon}
          component="a"
          href={item.href}
          target="_blank"
          rel="noreferrer"
          sx={{ bgcolor: 'background.paper', color: 'text.primary', border: '1px solid var(--duncit-card-border)' }}
        >
          {item.label}
        </DuncitButton>
      ))}
    </Stack>
  );
}