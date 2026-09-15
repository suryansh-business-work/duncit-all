import type { ReactNode } from 'react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';

interface Props {
  testId: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

/** One tappable row under "Your name has been added": an icon disc, the
 * label and a chevron. Native twin: components/city-launch/CityLaunchActionTile. */
export default function CityLaunchActionTile({ testId, icon, label, onClick }: Readonly<Props>) {
  return (
    <Card data-testid={testId}>
      <CardActionArea data-testid={`${testId}-button`} onClick={onClick} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'primary.main',
              flex: '0 0 auto',
            }}
          >
            {icon}
          </Box>
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
            {label}
          </Typography>
          <ChevronRightIcon aria-hidden sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
