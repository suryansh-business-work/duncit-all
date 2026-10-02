import type { HTMLAttributes } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub } from '../create-pod.types';
import { useClubSlotsLabel } from './useClubSlotsLabel';

interface Props extends HTMLAttributes<HTMLLIElement> {
  club: CreatePodClub;
  /** 'Gomti Nagar, Lucknow' — '' when the club names neither. */
  place: string;
  /** Physical pods only — a virtual pod books no venue slot. */
  showSlots?: boolean;
}

/**
 * One club in step 1's picker, read as "Who Even Are We? | (pin) Gomti Nagar,
 * Lucknow · 4 open slots": two clubs can share a name, and the place is what
 * tells them apart; the slot count says whether a physical pod can happen there.
 * Native twin: the club rows in ClubSearchField.
 */
export default function ClubOption({ club, place, showSlots = false, ...optionProps }: Readonly<Props>) {
  const { t } = useTranslation();
  const slots = useClubSlotsLabel(club);
  const named = place ? t('mweb.createPod.clubOptionAria', { vars: { club: club.club_name, place } }) : club.club_name;
  const ariaLabel = showSlots ? `${named}, ${slots.label}` : named;
  return (
    <Box
      component="li"
      {...optionProps}
      aria-label={ariaLabel}
      data-testid={`create-pod-club-option-${club.id}`}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}
    >
      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
        {club.club_name}
      </Typography>
      {place && (
        <>
          <Typography variant="body2" aria-hidden sx={{ color: 'text.secondary' }}>
            |
          </Typography>
          <PlaceIcon fontSize="small" aria-hidden sx={{ color: 'text.secondary' }} />
          <Typography
            variant="body2"
            noWrap
            data-testid={`create-pod-club-option-${club.id}-place`}
            sx={{ color: 'text.secondary', minWidth: 0 }}
          >
            {place}
          </Typography>
        </>
      )}
      {showSlots && (
        <Chip
          size="small"
          variant="outlined"
          color={slots.open ? 'default' : 'warning'}
          label={slots.label}
          data-testid={`create-pod-club-option-${club.id}-slots`}
          sx={{ ml: 'auto', flexShrink: 0 }}
        />
      )}
    </Box>
  );
}
