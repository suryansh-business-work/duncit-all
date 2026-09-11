import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, Chip, Divider, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

export interface QuickAction {
  key: string;
  icon: ReactNode;
  label: string;
  /** A line under the label — why the action is off, say. */
  caption?: string;
  /** A small accent count at the row's end — "3 pending". */
  badge?: string;
  to: string;
  disabled?: boolean;
}

/** A row's press highlight runs edge to edge; the card clips its corners. */
const ROW_SX = { '& .MuiCardActionArea-focusHighlight': { borderRadius: 0 } } as const;

/** One door: the accent glyph on a soft disc, the label, and a chevron. */
function QuickActionRow({ action }: Readonly<{ action: QuickAction }>) {
  const body = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 1.5, minHeight: 60 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'secondary.main',
        }}
      >
        {action.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
          {action.label}
        </Typography>
        {action.caption && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            {action.caption}
          </Typography>
        )}
      </Box>
      {action.badge && (
        <Chip size="small" color="secondary" label={action.badge} sx={{ height: 24, minHeight: 24 }} />
      )}
      <ChevronRightRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
    </Stack>
  );
  if (action.disabled) {
    return (
      <CardActionArea disabled sx={ROW_SX}>
        {body}
      </CardActionArea>
    );
  }
  return (
    <CardActionArea component={RouterLink} to={action.to} sx={ROW_SX}>
      {body}
    </CardActionArea>
  );
}

interface Props {
  actions: readonly QuickAction[];
  testId: string;
}

/**
 * A studio's quick doors as one list card — rows split by a hairline, never a
 * card per door. Club Studio and Venue Studio open their pages through it.
 */
export default function QuickActionList({ actions, testId }: Readonly<Props>) {
  return (
    <Card data-testid={testId}>
      <Stack divider={<Divider sx={{ mx: 2 }} />}>
        {actions.map((action) => (
          <QuickActionRow key={action.key} action={action} />
        ))}
      </Stack>
    </Card>
  );
}
