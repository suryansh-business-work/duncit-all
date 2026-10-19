import { Box, Stack, Typography } from '@mui/material';

import { SectionHeading } from '../../../components/SectionHeading';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { ItemIcon } from './ItemIcon';
import type { SectionProps } from './types';

const MAX_DESKTOP_COLUMNS = 5;

/**
 * USP_STRIP — why buy here: one rounded strip, each point an icon on a 48px
 * plate with its title and line. Two columns on a phone; on a desktop one row
 * of up to five, split by hairline dividers.
 */
export function UspStripSection({ section }: Readonly<SectionProps>) {
  if (section.items.length === 0) return null;
  const columns = Math.min(section.items.length, MAX_DESKTOP_COLUMNS);
  return (
    <Box component="section" aria-label={section.title || undefined}>
      {section.title ? <SectionHeading title={section.title} subtitle={section.subtitle} /> : null}
      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          m: 0,
          display: 'grid',
          rowGap: 3,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${columns}, minmax(0, 1fr))` },
          bgcolor: T.surface,
          borderRadius: `${T.radius.card}px`,
          boxShadow: T.shadow,
          px: { xs: 2, md: 3 },
          py: { xs: 2.5, md: 3.5 },
        }}
      >
        {section.items.map((item, position) => (
          <Stack
            component="li"
            key={item.id}
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              minWidth: 0,
              px: { md: 2 },
              borderLeft: { md: position % columns === 0 ? 0 : 1 },
              borderColor: { md: T.border },
            }}
          >
            <ItemIcon src={item.image_url} plate={48} icon={32} />
            <Stack sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }}>{item.title}</Typography>
              {item.subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {item.subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
