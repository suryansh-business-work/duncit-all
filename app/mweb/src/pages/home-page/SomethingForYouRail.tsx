import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  clampSomethingForYouTitle,
  resolveSomethingForYouTarget,
  SOMETHING_FOR_YOU_TITLE_LINES,
  type SomethingForYouItem,
  type SomethingForYouTarget,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

const SOMETHING_FOR_YOU = gql`
  query PublicSomethingForYou {
    publicSomethingForYou {
      id
      title
      image_url
      bottom_text
      action_type
      link_path
      link_url
    }
  }
`;

/** One card's footprint. Fixed so the row scrolls in even steps. */
const CARD_WIDTH = 168;
const CARD_HEIGHT = 232;

/**
 * Written in px, not as a multiplier.
 *
 * `borderRadius: 3` in an `sx` block is not three pixels — MUI multiplies it by
 * `theme.shape.borderRadius`, which is 16 here, so the cards were rendering at
 * 48px and looked like lozenges. A string with a unit means what it says, and
 * the native twin uses the same number so the two rails match.
 */
const CARD_RADIUS = '4px';

/**
 * The row that scrolls sideways at the bottom of Home.
 *
 * Every card is the same size and carries its own picture, which is what lets
 * an admin change a promotion without anyone touching a stylesheet. The
 * headline is clamped in two directions — characters by @duncit/utils, lines by
 * the box — because the card cannot grow: whatever does not fit is simply gone,
 * and a headline that ends mid-word reads as broken rather than short.
 *
 * The native twin renders the same rows to the same proportions in Tamagui.
 */
export default function SomethingForYouRail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery<{ publicSomethingForYou: SomethingForYouItem[] }>(SOMETHING_FOR_YOU, {
    fetchPolicy: 'cache-first',
  });
  const items = data?.publicSomethingForYou ?? [];
  if (items.length === 0) return null;

  /*
    A route stays in the app; an address leaves it.

    `navigate` keeps mWeb's history and its scroll position, so a card that
    points at one of our own screens never costs the visitor their place on
    Home. An outside address opens in a new tab for the same reason — this row
    sits at the BOTTOM of Home, which somebody has already scrolled to reach.
  */
  const open = (target: SomethingForYouTarget) => {
    if (target.kind === 'route') navigate(target.path);
    if (target.kind === 'url') globalThis.open(target.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Stack spacing={1.25}>
      <Typography
        variant="overline"
        sx={{
          fontWeight: 800,
          color: "text.secondary",
          px: 0.25
        }}>
        {t('mweb.home.somethingForYou')}
      </Typography>

      {/* Bleeds to the screen edge so the last card is visibly cut off — the
          only honest signal that a row scrolls when there is no scrollbar. */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          px: 0.25,
          pb: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item) => {
          const target = resolveSomethingForYouTarget(item);
          const opens = target.kind !== 'none';
          return (
            <Box
              key={item.id}
              component={opens ? 'button' : 'div'}
              onClick={opens ? () => open(target) : undefined}
              sx={{
                all: opens ? 'unset' : undefined,
                flex: `0 0 ${CARD_WIDTH}px`,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                position: 'relative',
                borderRadius: CARD_RADIUS,
                overflow: 'hidden',
                scrollSnapAlign: 'start',
                cursor: opens ? 'pointer' : 'default',
                bgcolor: 'primary.main',
              }}
            >
              <Box
                component="img"
                src={item.image_url}
                alt=""
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              <Typography
                variant="subtitle2"
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  right: 12,
                  color: 'common.white',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  textShadow: '0 1px 3px rgba(0,0,0,.45)',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: SOMETHING_FOR_YOU_TITLE_LINES,
                  overflow: 'hidden',
                }}
              >
                {clampSomethingForYouTitle(item.title)}
              </Typography>

              {item.bottom_text && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    px: 1.25,
                    py: 1,
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'common.white',
                    bgcolor: 'rgba(0,0,0,.42)',
                    backdropFilter: 'blur(2px)',
                  }}
                  noWrap
                >
                  {item.bottom_text}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
