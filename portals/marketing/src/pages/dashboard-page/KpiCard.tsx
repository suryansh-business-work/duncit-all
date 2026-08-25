import type { ReactNode } from 'react';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
  /** One line of context under the number — what it is a share of, or what
   * else is true. A bare number on a dashboard invites the wrong reading. */
  hint?: string;
  icon: ReactNode;
  onOpen?: () => void;
}

/**
 * One headline number. A stat tile rather than a chart: a single value has no
 * shape to show, and drawing one as a chart is decoration.
 */
export default function KpiCard({ label, value, hint, icon, onOpen }: Readonly<Props>) {
  const body = (
    <CardContent>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "flex-start"
      }}>
        <Box
          sx={{
            display: 'flex',
            p: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" component="div" sx={{
            color: "text.secondary"
          }}>
            {label}
          </Typography>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2
            }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" component="div" sx={{
              color: "text.secondary"
            }}>
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  );

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      {onOpen ? (
        <CardActionArea onClick={onOpen} sx={{ height: '100%' }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
