import type { ReactNode } from 'react';
import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
  disabled: boolean;
}

/** A single "earn" path card on the Earn with Duncit page. Disabled when the
 * signed-in user already holds the matching role. */
export default function EarnBox({ icon, title, description, to, disabled }: Readonly<Props>) {
  const navigate = useNavigate();
  return (
    <Card variant="outlined" sx={{ borderRadius: 4, opacity: disabled ? 0.55 : 1 }}>
      <CardActionArea disabled={disabled} onClick={() => navigate(to)} sx={{ p: 1 }}>
        <CardContent>
          <Stack spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                color: 'primary.contrastText',
                background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
              }}
            >
              {icon}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            {disabled && <Chip size="small" color="success" label="Already enabled" sx={{ fontWeight: 800 }} />}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
