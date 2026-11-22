import type { ReactElement } from 'react';
import { Chip, Stack } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useTranslation, type Translate } from './i18n/useTranslation';

/** The channels a person can be reached on. Any of them may be missing. */
export interface ContactDetails {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface ContactLink {
  key: 'email' | 'phone' | 'whatsapp';
  href: string;
  label: string;
  icon: ReactElement;
  external?: boolean;
}

/** `tel:` and `wa.me` want the number without its spaces and separators. The
 * plus survives on the dialable one — a foreign country code is data. */
const dialable = (raw: string) => raw.replace(/[^\d+]/g, '');
const waDigits = (raw: string) => raw.replace(/\D/g, '');

/**
 * The channels a person can actually be reached on, in reading order — the
 * `mailto:` / `tel:` / `wa.me` links the club admins card and the Club Admin
 * host pages both offer. One copy, so a number dials the same way everywhere.
 */
export function contactLinks(contact: ContactDetails, t: Translate): ContactLink[] {
  const links: ContactLink[] = [];
  if (contact.email) {
    links.push({
      key: 'email',
      href: `mailto:${contact.email}`,
      label: `${t('podDetailsPanel.podClubAdminsCard.email')}: ${contact.email}`,
      icon: <EmailIcon />,
    });
  }
  const dial = dialable(contact.phone ?? '');
  if (dial) {
    links.push({
      key: 'phone',
      href: `tel:${dial}`,
      label: `${t('podDetailsPanel.podClubAdminsCard.phone')}: ${contact.phone}`,
      icon: <PhoneIcon />,
    });
  }
  const wa = waDigits(contact.whatsapp ?? '');
  if (wa) {
    links.push({
      key: 'whatsapp',
      href: `https://wa.me/${wa}`,
      label: `${t('podDetailsPanel.podClubAdminsCard.whatsapp')}: ${contact.whatsapp}`,
      icon: <WhatsAppIcon />,
      external: true,
    });
  }
  return links;
}

interface Props {
  contact: ContactDetails;
  /** e2e handle prefix: each chip is `<testId>-<channel>`. */
  testId?: string;
}

/** Every way to reach someone, as clickable chips. Renders nothing when there is none. */
export default function ContactChips({ contact, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const links = contactLinks(contact, t);
  if (links.length === 0) return null;
  return (
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
          // The chip's label is its visible text; spelled out so the link's
          // name does not depend on how Chip nests it.
          aria-label={link.label}
          href={link.href}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noopener' : undefined}
          // A chip inside a clickable table row must not also open the row.
          onClick={(event) => event.stopPropagation()}
          data-testid={testId ? `${testId}-${link.key}` : undefined}
          sx={{ maxWidth: '100%' }}
        />
      ))}
    </Stack>
  );
}
