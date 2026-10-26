import type { ReactNode } from 'react';
import { Avatar, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { telHref } from './contact-links';

export interface PartyCardProps {
  /** "Host" or "Venue". */
  role: string;
  name: string;
  photo?: string | null;
  /** The face shown when there is no photo. */
  fallbackIcon: ReactNode;
  /** A few facts, one line each (handle, bio, type and capacity, address, who to ask for). */
  details: readonly string[];
  phone: string;
  email: string;
  /** "View profile" / "View venue"; left out, no button. */
  action?: { label: string; onClick: () => void };
  testId: string;
}

/**
 * One side of a venue chat on its contact sheet: its face and name, a few
 * details, and how to reach it — a phone to dial and an email to write to.
 */
export default function PartyCard({ role, name, photo, fallbackIcon, details, phone, email, action, testId }: Readonly<PartyCardProps>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" data-testid={testId}>
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar alt="" src={photo ?? undefined} sx={{ width: 56, height: 56 }}>
              {fallbackIcon}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                {role}
              </Typography>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
                {name}
              </Typography>
            </Stack>
          </Stack>
          {details.map((line) => (
            <Typography key={line} variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
              {line}
            </Typography>
          ))}
          {!phone && !email && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('availability.offers.chat.noContact')}
            </Typography>
          )}
          {phone && (
            <Link
              href={telHref(phone)}
              aria-label={`${t('availability.offers.chat.contactPhone')} ${phone}`}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 700 }}
            >
              <PhoneRoundedIcon fontSize="small" aria-hidden />
              {phone}
            </Link>
          )}
          {email && (
            <Link
              href={`mailto:${email}`}
              aria-label={`${t('availability.offers.chat.contactEmail')} ${email}`}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, overflowWrap: 'anywhere' }}
            >
              <MailOutlineRoundedIcon fontSize="small" aria-hidden />
              {email}
            </Link>
          )}
          {action && (
            <DuncitButton variant="outlined" onClick={action.onClick} sx={{ alignSelf: 'flex-start' }} data-testid={`${testId}-action`}>
              {action.label}
            </DuncitButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
