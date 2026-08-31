import type { ReactElement } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Avatar, Chip, Link, Stack, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SectionCard from './SectionCard';
import { POD_CLUB_DETAIL } from './queries';
import { useTranslation, type Translate } from './i18n/useTranslation';

interface Props {
  clubId: string | null;
  /** Where an admin's name links to. Omit on a portal with no user pages — a
   * name that navigates nowhere is worse than a name that is only a name. */
  userTo?: (userId: string) => string;
}

/** A `ClubActor` in its admin flavour — the contact details the server lifts
 * off the admin's own profile. Everything but the id and the name is optional,
 * because a profile that never filled one in has nothing to show. */
export interface PodClubAdmin {
  id: string;
  name: string;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

interface ContactLink {
  key: string;
  href: string;
  label: string;
  icon: ReactElement;
  external?: boolean;
}

/** `tel:` and `wa.me` want the number without its spaces and separators. The
 * plus survives on the dialable one — a foreign country code is data. */
const dialable = (raw: string) => raw.replace(/[^\d+]/g, '');
const waDigits = (raw: string) => raw.replace(/\D/g, '');

/** The channels this admin can actually be reached on, in reading order. */
function contactLinks(admin: PodClubAdmin, t: Translate): ContactLink[] {
  const links: ContactLink[] = [];
  if (admin.email) {
    links.push({
      key: 'email',
      href: `mailto:${admin.email}`,
      label: `${t('podDetailsPanel.podClubAdminsCard.email')}: ${admin.email}`,
      icon: <EmailIcon />,
    });
  }
  const dial = dialable(admin.phone ?? '');
  if (dial) {
    links.push({
      key: 'phone',
      href: `tel:${dial}`,
      label: `${t('podDetailsPanel.podClubAdminsCard.phone')}: ${admin.phone}`,
      icon: <PhoneIcon />,
    });
  }
  const wa = waDigits(admin.whatsapp ?? '');
  if (wa) {
    links.push({
      key: 'whatsapp',
      href: `https://wa.me/${wa}`,
      label: `${t('podDetailsPanel.podClubAdminsCard.whatsapp')}: ${admin.whatsapp}`,
      icon: <WhatsAppIcon />,
      external: true,
    });
  }
  return links;
}

/** One admin — who they are, and every way to reach them. */
function ClubAdminRow({
  admin,
  onOpenUser,
  t,
}: Readonly<{
  admin: PodClubAdmin;
  onOpenUser: ((userId: string) => void) | null;
  t: Translate;
}>) {
  const links = contactLinks(admin, t);
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Avatar src={admin.avatar_url ?? undefined} sx={{ width: 40, height: 40 }}>
        {(admin.name?.[0] ?? '?').toUpperCase()}
      </Avatar>
      <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
        {onOpenUser ? (
          <Link
            component="button"
            underline="hover"
            onClick={() => onOpenUser(admin.id)}
            sx={{ fontWeight: 700, textAlign: 'left' }}
          >
            {admin.name}
          </Link>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {admin.name}
          </Typography>
        )}
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {links.map((link) => (
            <Chip
              key={link.key}
              component="a"
              clickable
              size="small"
              variant="outlined"
              icon={link.icon}
              label={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener' : undefined}
              sx={{ maxWidth: '100%' }}
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}

/**
 * Who runs the club this pod belongs to, and how to reach them.
 *
 * Its own card rather than a line inside the club card: the club answers "which
 * club is this", while these are the people somebody picks up the phone to when
 * a pod goes wrong — and a name with no number beside it was never the answer
 * to that. Reads the same document the club card does, so the two share one
 * round trip through the Apollo cache.
 */
export default function PodClubAdminsCard({ clubId, userTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(POD_CLUB_DETAIL, {
    variables: { id: clubId },
    skip: !clubId,
  });
  const club = data?.club;
  const admins: PodClubAdmin[] = club?.club_admins ?? [];
  const settled = !error && !loading;

  const emptyText = () => {
    if (!settled) return null;
    if (!club) return t('podDetailsPanel.common.noClubLinked');
    return admins.length === 0 ? t('podDetailsPanel.podClubAdminsCard.noClubAdmins') : null;
  };
  const openUser = userTo ? (userId: string) => navigate(userTo(userId)) : null;

  return (
    <SectionCard
      icon={<AdminPanelSettingsIcon fontSize="small" />}
      title={t('podDetailsPanel.podClubAdminsCard.clubAdminDetails')}
      badge={admins.length > 0 ? admins.length : undefined}
      loading={loading && !club}
      error={error?.message}
      empty={emptyText()}
    >
      <Stack spacing={2}>
        {admins.map((admin) => (
          <ClubAdminRow key={admin.id} admin={admin} onOpenUser={openUser} t={t} />
        ))}
      </Stack>
    </SectionCard>
  );
}
