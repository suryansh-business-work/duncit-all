import type { ReactNode } from 'react';
import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/** Contextual next-step action shown beside the "Already enabled" chip for a
 * role the user already holds (e.g. host more, register another venue). */
export interface EarnBoxCta {
  label: string;
  onClick: () => void;
}

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
  disabled: boolean;
  /** Chip text shown when disabled (role held / meeting pending). */
  disabledLabel?: string;
  /** When set (approved user), rendered as a button to the right of the chip. */
  cta?: EarnBoxCta;
}

/** A single "earn" path card on the Earn with Duncit page. Disabled when the
 * signed-in user already holds the matching role or an onboarding meeting for
 * it is still pending. Approved cards keep the "Already enabled" chip and add a
 * contextual next-step CTA (rendered outside the disabled action area so it
 * stays clickable). */
export default function EarnBox({
  icon,
  title,
  description,
  to,
  disabled,
  disabledLabel = 'Already enabled',
  cta,
}: Readonly<Props>) {
  const navigate = useNavigate();
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        opacity: disabled && !cta ? 0.55 : 1,
        boxShadow: 'none',
        '&:hover': { boxShadow: 'none' },
      }}
    >
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
            {disabled && !cta && (
              <Chip size="small" color="success" label={disabledLabel} sx={{ fontWeight: 800 }} />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
      {cta && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip size="small" color="success" label={disabledLabel} sx={{ fontWeight: 800 }} />
            <Button
              size="small"
              variant="contained"
              onClick={cta.onClick}
              sx={{ borderRadius: 999, fontWeight: 800, textTransform: 'none' }}
            >
              {cta.label}
            </Button>
          </Stack>
        </Box>
      )}
    </Card>
  );
}
