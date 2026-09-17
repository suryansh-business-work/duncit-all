import type { HTMLAttributes } from 'react';
import { Box, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub } from '../create-pod.types';

interface Props extends HTMLAttributes<HTMLLIElement> {
  club: CreatePodClub;
  /** 'Gomti Nagar, Lucknow' — '' when the club names neither. */
  place: string;
}

/**
 * One club in step 2's picker, read as "Who Even Are We? | (pin) Gomti Nagar,
 * Lucknow": two clubs can share a name, and the place is what tells them apart.
 * Native twin: the club chips in ChipSelectField.
 */
export default function ClubOption({ club, place, ...optionProps }: Readonly<Props>) {
  const { t } = useTranslation();
  const ariaLabel = place
    ? t('mweb.createPod.clubOptionAria', { vars: { club: club.club_name, place } })
    : undefined;
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
    </Box>
  );
}
