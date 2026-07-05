import ChatIcon from '@mui/icons-material/Chat';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Button, Stack } from '@mui/material';

interface Props {
  club: any;
}

export default function ClubSocialLinks({ club }: Readonly<Props>) {
  const social = [
    { label: 'Community', href: club.club_whats_app_community_link, icon: <WhatsAppIcon /> },
    { label: 'Group chat', href: club.club_whats_app_group_link, icon: <ChatIcon /> },
  ].filter((item) => item.href);

  if (social.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {social.map((item) => (
        <Button
          key={item.label}
          variant="outlined"
          startIcon={item.icon}
          size="small"
          component="a"
          href={item.href}
          target="_blank"
          rel="noreferrer"
          sx={{ textTransform: 'none' }}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}