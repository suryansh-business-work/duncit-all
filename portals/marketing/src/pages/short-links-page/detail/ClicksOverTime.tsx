import { Box, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import { fillDailySeries, niceTicks, type DailyPoint } from './daily-series';

interface Props {
  daily: DailyPoint[];
  formatDate: (value: Date | string) => string;
  days?: number;
  /** Injected so the axis is deterministic in tests. */
  today?: Date;
}

const PLOT_HEIGHT = 168;

/**
 * Clicks per day. A single series, so it wears the app's own accent and needs
 * no legend — the title names it. Magnitude is readable off the axis rather
 * than from colour alone, and every bar carries its exact value on hover.
 */
export default function ClicksOverTime({
  daily,
  formatDate,
  days = 30,
  today = new Date(),
}: Readonly<Props>) {
  const series = fillDailySeries(daily, days, today);
  const peak = series.reduce((max, point) => Math.max(max, point.count), 0);
  const ticks = niceTicks(peak);
  const top = ticks[0];
  const total = series.reduce((sum, point) => sum + point.count, 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          sx={{
            alignItems: "baseline",
            justifyContent: "space-between",
            mb: 2
          }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>
            Clicks over time
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {`Last ${days} days · ${total.toLocaleString()} clicks`}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          {/* Axis labels sit outside the plot so bars start at a clean baseline. */}
          <Stack
            sx={{
              justifyContent: "space-between",
              height: PLOT_HEIGHT,
              flexShrink: 0,
              textAlign: 'right'
            }}>
            {ticks.map((tick) => (
              <Typography
                key={tick}
                variant="caption"
                sx={{
                  color: "text.secondary",
                  lineHeight: 0
                }}>
                {tick.toLocaleString()}
              </Typography>
            ))}
          </Stack>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ position: 'relative', height: PLOT_HEIGHT }}>
              {ticks.map((tick) => (
                <Box
                  key={tick}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    // Recessive: the data is the subject, the grid is scaffolding.
                    bottom: `${(tick / top) * 100}%`,
                    borderBottom: 1,
                    borderColor: 'divider',
                    opacity: tick === 0 ? 1 : 0.4,
                  }}
                />
              ))}

              <Stack
                direction="row"
                spacing="2px"
                sx={{
                  alignItems: "flex-end",
                  position: 'absolute',
                  inset: 0
                }}>
                {series.map((point) => (
                  <Tooltip
                    key={point.date}
                    title={`${formatDate(point.date)} — ${point.count.toLocaleString()} clicks`}
                  >
                    <Box
                      data-testid="click-bar"
                      data-count={point.count}
                      sx={{
                        flex: 1,
                        minWidth: 2,
                        height: `${(point.count / top) * 100}%`,
                        // A day with no clicks keeps its slot but draws nothing,
                        // so the gap itself is the information.
                        minHeight: point.count > 0 ? 3 : 0,
                        bgcolor: 'primary.main',
                        borderRadius: '4px 4px 0 0',
                        transition: 'opacity 120ms',
                        '&:hover': { opacity: 0.75 },
                      }}
                    />
                  </Tooltip>
                ))}
              </Stack>
            </Box>

            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                mt: 0.75
              }}>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {formatDate(series[0].date)}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {/* fillDailySeries always returns one point per day, days >= 1. */}
                {formatDate(series.at(-1)!.date)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
