import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { formatINR } from '@duncit/utils';
import type { DashboardTopLink } from './queries';

interface Props {
  links: DashboardTopLink[];
  onOpen: (link: DashboardTopLink) => void;
}

/** The links that earned their traffic, ranked. Bars are shares of the
 * busiest link, so the gap between first and fifth is readable at a glance. */
export default function TopLinksCard({ links, onOpen }: Readonly<Props>) {
  const busiest = links[0]?.clicks ?? 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          Busiest links
        </Typography>

        {links.length === 0 && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No link has been followed yet.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {links.map((link) => (
            <Box
              key={link.id}
              role="button"
              tabIndex={0}
              data-testid="top-link"
              onClick={() => onOpen(link)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onOpen(link);
              }}
              sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
            >
              <Stack direction="row" spacing={1} sx={{
                justifyContent: "space-between"
              }}>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontWeight: 600,
                    minWidth: 0
                  }}>
                  {link.label}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "baseline",
                    flexShrink: 0
                  }}>
                  {link.revenue > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "success.main",
                        fontWeight: 700
                      }}>
                      {formatINR(link.revenue)}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{
                    fontWeight: 700
                  }}>
                    {link.clicks.toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                // busiest is 0 only when there are no links, and then this
                // never renders.
                value={Math.round((link.clicks / busiest) * 100)}
                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
