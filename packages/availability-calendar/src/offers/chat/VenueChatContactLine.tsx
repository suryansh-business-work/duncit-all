import { Link, Stack, Typography } from '@mui/material';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import { useTranslation } from '@duncit/app-settings';
import type { VenueChatContact } from '@duncit/utils';

/**
 * A phone number as a dialable `tel:` target: its digits and a leading +,
 * nothing else. `replace(/g)` rather than `replaceAll` — this package's
 * tsconfig lib predates ES2021.
 */
const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

/**
 * How to reach the other side of a venue chat outside it: their name, phone (a
 * `tel:` link) and email (a `mailto:` link). Nothing when the room carries
 * neither (`venueChatCounterpart(room).contact`).
 */
export default function VenueChatContactLine({ contact }: Readonly<{ contact: VenueChatContact | null }>) {
  const { t } = useTranslation();
  if (!contact) return null;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}
      data-testid="venue-chat-contact"
    >
      {contact.name && (
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {contact.name}
        </Typography>
      )}
      {contact.phone && (
        <Link
          href={telHref(contact.phone)}
          variant="caption"
          aria-label={`${t('availability.offers.chat.contactPhone')} ${contact.phone}`}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <PhoneRoundedIcon fontSize="inherit" aria-hidden />
          {contact.phone}
        </Link>
      )}
      {contact.email && (
        <Link
          href={`mailto:${contact.email}`}
          variant="caption"
          aria-label={`${t('availability.offers.chat.contactEmail')} ${contact.email}`}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, overflowWrap: 'anywhere' }}
        >
          <MailOutlineRoundedIcon fontSize="inherit" aria-hidden />
          {contact.email}
        </Link>
      )}
    </Stack>
  );
}
