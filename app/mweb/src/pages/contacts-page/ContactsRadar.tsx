import { useMemo } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { RADAR_RINGS, radarPositions } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { ContactRow } from './queries';

const sweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const FACE = 44;

/** The sweep: a 70° wedge of the brand colour fading to nothing. */
const sweepGradient = (tint: string): string =>
  ['conic-gradient(from 0deg,', tint, '0deg, transparent 70deg)'].join(' ');

interface Props {
  contacts: ContactRow[];
  me: { name: string; photo?: string | null };
  onOpen: (userId: string) => void;
}

/**
 * The radar: the viewer in the middle, every matched contact on a ring around
 * them — the ones in the same city on the inner rings — and a slow sweep. Each
 * face opens that person's profile. Twin of native `ContactsRadar` (rule 27);
 * the ring maths is `radarPositions` in @duncit/utils, shared by both.
 */
export default function ContactsRadar({ contacts, me, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const points = useMemo(
    () =>
      radarPositions(contacts.map((row) => ({ id: row.profile.user_id, nearby: row.is_nearby }))),
    [contacts]
  );
  const plotted = contacts.filter((row) => points.has(row.profile.user_id));

  return (
    <Box
      role="group"
      aria-label={t('mweb.contacts.radarLabel')}
      data-testid="contacts-radar"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 360,
        aspectRatio: '1 / 1',
        mx: 'auto',
        borderRadius: '50%',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      {RADAR_RINGS.map((ring) => (
        <Box
          key={ring}
          sx={{
            position: 'absolute',
            left: `${(1 - ring) * 50}%`,
            top: `${(1 - ring) * 50}%`,
            width: `${ring * 100}%`,
            height: `${ring * 100}%`,
            borderRadius: '50%',
            border: '1px dashed',
            borderColor: 'divider',
            pointerEvents: 'none',
          }}
        />
      ))}
      <Box
        aria-hidden
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: sweepGradient(alpha(theme.palette.secondary.main, 0.18)),
          animation: `${sweep} 6s linear infinite`,
          pointerEvents: 'none',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        })}
      />

      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Avatar
          src={me.photo || undefined}
          sx={{
            width: FACE + 8,
            height: FACE + 8,
            mx: 'auto',
            border: 3,
            borderColor: 'secondary.main',
            bgcolor: 'primary.main',
            fontWeight: 600,
          }}
        >
          {me.name[0]?.toUpperCase()}
        </Avatar>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {t('mweb.contacts.you')}
        </Typography>
      </Box>

      {plotted.map((row) => {
        const point = points.get(row.profile.user_id)!;
        const name = row.profile.full_name || row.profile.first_name || row.contact_label;
        return (
          <Avatar
            key={row.profile.user_id}
            src={row.profile.profile_photo || undefined}
            role="button"
            tabIndex={0}
            aria-label={t('mweb.podDetails.openProfileOf', { vars: { name } })}
            data-testid={`contacts-radar-${row.profile.user_id}`}
            onClick={() => onOpen(row.profile.user_id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(row.profile.user_id);
              }
            }}
            sx={{
              position: 'absolute',
              left: `calc(${point.x * 100}% - ${FACE / 2}px)`,
              top: `calc(${point.y * 100}% - ${FACE / 2}px)`,
              width: FACE,
              height: FACE,
              cursor: 'pointer',
              border: 2,
              borderColor: row.is_nearby ? 'secondary.main' : 'background.paper',
              bgcolor: 'primary.main',
              fontWeight: 600,
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
            }}
          >
            {name[0]?.toUpperCase()}
          </Avatar>
        );
      })}
    </Box>
  );
}
