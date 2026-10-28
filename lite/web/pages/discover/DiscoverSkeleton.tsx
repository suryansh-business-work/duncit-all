import { Box, Card, Divider, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Dot, Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';
import { CATEGORY_GRID } from './CategoryGrid';
import { CITY_GRID } from './CityRegions';
import { THREE_COLUMNS, TWO_COLUMNS } from './DiscoverSections';

/** A band's heading line, and the second line under it where the band has one. */
function Heading({ subtitle = false }: Readonly<{ subtitle?: boolean }>) {
  return (
    <Stack>
      <TextLine width={200} typo="h3" />
      {subtitle ? <TextLine width={110} /> : null}
    </Stack>
  );
}

/** Discover while it loads, band by band: popular events, categories, featured calendars, cities. */
export function DiscoverSkeleton() {
  return (
    <SkeletonFrame testId="discover-skeleton">
      <Stack spacing={4} divider={<Divider flexItem />}>
        <Stack spacing={2}>
          <Heading subtitle />
          <Box sx={TWO_COLUMNS}>
            {slots('popular', 6).map((row) => (
              <Stack key={row} direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 0.75 }}>
                <Shape width={68} height={68} radius={`${LITE_RADII.control}px`} />
                <Stack sx={{ flexGrow: 1 }}>
                  <TextLine width="45%" typo="caption" />
                  <TextLine width="85%" />
                  <TextLine width="55%" typo="caption" />
                </Stack>
              </Stack>
            ))}
          </Box>
        </Stack>
        <Stack spacing={2}>
          <Heading />
          <Box sx={CATEGORY_GRID}>
            {slots('category', 6).map((tile) => (
              <Card key={tile} sx={{ px: 1.75, py: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Shape width={28} height={28} radius={1} />
                  <Stack sx={{ flexGrow: 1 }}>
                    <TextLine width="60%" typo="body2" />
                    <TextLine width="40%" typo="caption" />
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Box>
        </Stack>
        <Stack spacing={2}>
          <Heading />
          <Box sx={THREE_COLUMNS}>
            {slots('calendar', 3).map((card) => (
              <Card key={card} sx={{ p: 1.75 }}>
                <Stack spacing={1.25}>
                  <Shape width={40} height={40} radius={2} />
                  <TextLine width="60%" />
                  <TextLine width="90%" typo="body2" />
                  <TextLine width="70%" typo="body2" />
                </Stack>
              </Card>
            ))}
          </Box>
        </Stack>
        <Stack spacing={2}>
          <Heading />
          <Box sx={CITY_GRID}>
            {slots('city', 8).map((city) => (
              <Stack key={city} direction="row" spacing={1.25} sx={{ alignItems: 'center', p: 0.5 }}>
                <Dot size={36} />
                <Stack sx={{ flexGrow: 1 }}>
                  <TextLine width="70%" typo="body2" />
                  <TextLine width="45%" typo="caption" />
                </Stack>
              </Stack>
            ))}
          </Box>
        </Stack>
      </Stack>
    </SkeletonFrame>
  );
}
