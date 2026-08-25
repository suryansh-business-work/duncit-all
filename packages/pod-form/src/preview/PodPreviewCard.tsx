import type { JSX } from 'react';
import { Card, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import PreviewMedia from './PreviewMedia';
import type { PodPreviewModel } from './pod-preview-model';

/** One caption line inside the card's floating info panel. */
function CardLine({ icon, text }: Readonly<{ icon: JSX.Element; text: string }>) {
  return (
    <Stack
      direction="row"
      spacing={0.4}
      sx={{
        alignItems: "center",
        minWidth: 0
      }}>
      {icon}
      <Typography
        variant="caption"
        noWrap
        sx={{
          color: "text.secondary",
          fontWeight: 600
        }}>
        {text}
      </Typography>
    </Stack>
  );
}

const smallIcon = { fontSize: 13, color: 'text.secondary', flex: '0 0 auto' };

/**
 * The pod exactly as it lands in a member's list — the image-first card mWeb
 * and the native app render, rebuilt here against the live form values.
 *
 * It is a STATIC twin of that card (no save button, no navigation): the apps'
 * own card is wired to pricing and bookmark hooks that only exist inside those
 * builds, so a portal cannot import it.
 */
export default function PodPreviewCard({ model }: Readonly<{ model: PodPreviewModel }>) {
  // Hoisted out of the JSX: a choice inline in a prop nests, and a preview that
  // has no date yet still has to say so rather than render a blank line.
  const priceColor = model.isFree ? 'success' : 'primary';
  const whenText = model.whenText || 'Date not set';

  return (
    <Card
      variant="outlined"
      sx={{
        width: 268,
        height: 250,
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 18px 42px rgba(9,7,18,0.22)',
      }}
    >
      <PreviewMedia media={model.media[0]} title={model.title} height={250} />

      {model.clubName && (
        <Chip
          size="small"
          icon={<EventIcon sx={{ fontSize: 13, color: 'inherit !important' }} />}
          label={model.clubName}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            maxWidth: 200,
            height: 26,
            fontWeight: 600,
            color: 'common.white',
            bgcolor: 'rgba(9,7,18,0.62)',
            backdropFilter: 'blur(6px)',
          }}
        />
      )}

      <Stack
        spacing={0.4}
        sx={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          p: 1.25,
          borderRadius: '14px',
          bgcolor: (theme) =>
            alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.78 : 0.8),
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardLine icon={<EventIcon sx={smallIcon} />} text={whenText} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            lineHeight: 1.15,
            fontSize: '1.15rem',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {model.title}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <CardLine icon={<GroupIcon sx={smallIcon} />} text={model.spotsText} />
          <Chip
            size="small"
            label={model.priceText}
            color={priceColor}
            sx={{ height: 24, fontWeight: 700, flex: '0 0 auto' }}
          />
        </Stack>
        {model.placeText && <CardLine icon={<PlaceIcon sx={smallIcon} />} text={model.placeText} />}
        {model.hostNames.length > 0 && (
          <CardLine icon={<PersonIcon sx={smallIcon} />} text={model.hostNames.join(', ')} />
        )}
      </Stack>
    </Card>
  );
}
