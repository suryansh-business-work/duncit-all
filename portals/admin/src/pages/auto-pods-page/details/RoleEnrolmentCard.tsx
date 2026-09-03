import type { ReactNode } from 'react';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { DuncitButton } from '@duncit/buttons';

export interface RoleEnrolmentCardProps {
  title: string;
  /** The partner who took this place, or '' while it is still open. */
  enrolledName: string;
  /** When they enrolled, already formatted; '' when nobody has. */
  enrolledAt: string;
  /** How many partners in this category could fill it; null while counting. */
  eligible: number | null;
  eligibleLabel: (n: number) => string;
  eligibleHint: string;
  enrolledAtLabel: string;
  pendingLabel: string;
  /** Shown instead of the count where the role does not apply (a virtual venue). */
  notNeeded?: string;
  /** Opens who enrolled — only offered once someone has. */
  onOpen?: () => void;
  openLabel: string;
  icon: ReactNode;
}

/**
 * One of the three enrolment places on an Auto Pod's own page: who has taken
 * it (green, with the date and a way into their details) or that it is still
 * open (amber), and — either way — how many approved partners in this
 * category could fill it. The count is the answer to "why has nobody
 * enrolled": a place with zero eligible partners can never be filled.
 */
export default function RoleEnrolmentCard({
  title,
  enrolledName,
  enrolledAt,
  eligible,
  eligibleLabel,
  eligibleHint,
  enrolledAtLabel,
  pendingLabel,
  notNeeded,
  onOpen,
  openLabel,
  icon,
}: Readonly<RoleEnrolmentCardProps>) {
  const done = !!enrolledName;
  const countLine = eligible === null ? '' : eligibleLabel(eligible);

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 240 }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {icon}
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          </Stack>

          <Chip
            size="small"
            color={done ? 'success' : 'warning'}
            variant={done ? 'filled' : 'outlined'}
            icon={done ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
            label={done ? enrolledName : pendingLabel}
            sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
          />

          {enrolledAt ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {enrolledAtLabel}: {enrolledAt}
            </Typography>
          ) : null}

          {notNeeded ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {notNeeded}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {countLine}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {eligibleHint}
              </Typography>
            </>
          )}

          {done && onOpen ? (
            <DuncitButton size="small" onClick={onOpen} sx={{ alignSelf: 'flex-start' }}>
              {openLabel}
            </DuncitButton>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
