import type { ReactElement } from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useTranslation } from '../../../i18n/useTranslation';
import { mailtoUrl, telUrl, whatsappUrl } from '../../pod-pending-page/podPending';

/** A `ClubActor` in its admin flavour — contact details lifted off the admin's profile. */
export interface CreatePodClubAdmin {
  id: string;
  name: string;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

interface ContactChip {
  key: string;
  href: string;
  value: string;
  label: string;
  icon: ReactElement;
  external?: boolean;
}

/** One club admin in a single compact row — name, then a tappable chip per
 * channel the profile actually has. The brief twin of pod-pending's ClubAdminCard. */
export default function ClubAdminContactRow({ admin }: Readonly<{ admin: CreatePodClubAdmin }>) {
  const { t } = useTranslation();
  const chips: ContactChip[] = [];
  if (admin.phone) {
    chips.push({ key: 'phone', href: telUrl(admin.phone), value: admin.phone, label: t('mweb.podPending.phone'), icon: <PhoneIcon /> });
  }
  const wa = whatsappUrl(admin.whatsapp ?? '');
  if (wa && admin.whatsapp) {
    chips.push({ key: 'whatsapp', href: wa, value: admin.whatsapp, label: t('mweb.podPending.whatsapp'), icon: <WhatsAppIcon />, external: true });
  }
  if (admin.email) {
    chips.push({ key: 'email', href: mailtoUrl(admin.email), value: admin.email, label: t('mweb.podPending.email'), icon: <EmailIcon /> });
  }

  return (
    <Stack data-testid="club-preview-admin" direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
      <Avatar alt="" src={admin.avatar_url ?? undefined} sx={{ width: 36, height: 36 }}>
        {(admin.name?.[0] ?? '?').toUpperCase()}
      </Avatar>
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {admin.name}
        </Typography>
        <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              data-testid={`club-preview-admin-${chip.key}`}
              component="a"
              clickable
              size="small"
              variant="outlined"
              icon={chip.icon}
              label={chip.value}
              aria-label={`${chip.label}: ${chip.value}`}
              href={chip.href}
              target={chip.external ? '_blank' : undefined}
              rel={chip.external ? 'noopener noreferrer' : undefined}
              sx={{ maxWidth: '100%' }}
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
