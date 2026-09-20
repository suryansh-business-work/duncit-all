import { Box, Stack, Typography } from '@mui/material';
import type { LaunchItem } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { GLASS_SX } from './LaunchGlass';
import { LAUNCH_ICONS } from './launchIcons';

/** One equal column per child, however many there are. */
const EQUAL_COLUMNS = {
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(0, 1fr)',
} as const;

interface Props {
  items: readonly LaunchItem[];
  testId: string;
}

/** A glass strip divided into equal cells, each a pictogram over a two-line caption. */
export function LaunchItemStrip({ items, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      component="ul"
      data-testid={testId}
      sx={{
        ...GLASS_SX,
        listStyle: 'none',
        m: 0,
        p: 1,
        ...EQUAL_COLUMNS,
      }}
    >
      {items.map((item, index) => (
        <Stack
          key={item.labelKey}
          component="li"
          spacing={0.5}
          sx={{
            alignItems: 'center',
            px: 0.5,
            py: 1,
            textAlign: 'center',
            borderLeft: index === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.18)',
            '& svg': { fontSize: 24, color: 'accent.main' },
          }}
        >
          {LAUNCH_ICONS[item.iconKey]}
          <Typography sx={{ fontSize: 12, lineHeight: 1.25, fontWeight: 600 }}>{t(item.labelKey)}</Typography>
        </Stack>
      ))}
    </Box>
  );
}

/** Round glass discs, each a pictogram with its caption under it, in one row. */
export function LaunchItemDiscs({ items, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      component="ul"
      data-testid={testId}
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        ...EQUAL_COLUMNS,
        gap: 1,
      }}
    >
      {items.map((item, index) => (
        <Stack
          key={item.labelKey}
          component="li"
          spacing={1}
          sx={{
            alignItems: 'center',
            textAlign: 'center',
            borderLeft: index === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <Box
            aria-hidden
            sx={{
              ...GLASS_SX,
              borderRadius: '50%',
              width: 56,
              height: 56,
              display: 'grid',
              placeItems: 'center',
              '& svg': { fontSize: 26, color: 'accent.main' },
            }}
          >
            {LAUNCH_ICONS[item.iconKey]}
          </Box>
          <Typography sx={{ fontSize: 13, lineHeight: 1.25, fontWeight: 600, px: 0.5 }}>{t(item.labelKey)}</Typography>
        </Stack>
      ))}
    </Box>
  );
}

/** Glass pills, a pictogram before each caption — stacked down the page, or in one wrapping row. */
export function LaunchItemPills({ items, testId, inline = false }: Readonly<Props & { inline?: boolean }>) {
  const { t } = useTranslation();
  return (
    <Stack
      component="ul"
      data-testid={testId}
      direction={inline ? 'row' : 'column'}
      spacing={1}
      sx={{ listStyle: 'none', m: 0, p: 0, alignItems: 'flex-start', flexWrap: inline ? 'wrap' : 'nowrap' }}
    >
      {items.map((item) => (
        <Stack
          key={item.labelKey}
          component="li"
          direction="row"
          spacing={1}
          sx={{
            ...GLASS_SX,
            borderRadius: 999,
            alignItems: 'center',
            px: 1.75,
            py: 1,
            '& svg': { fontSize: 20, color: 'accent.main' },
          }}
        >
          {LAUNCH_ICONS[item.iconKey]}
          <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{t(item.labelKey)}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
