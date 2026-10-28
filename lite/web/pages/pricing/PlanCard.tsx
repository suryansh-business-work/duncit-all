import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { tint } from '../../../shared/theme';
import { LITE_RADII } from '../../../shared/tokens';
import { useCanObserve } from '../../lib/motion';

interface PlanCardProps {
  name: string;
  badge: string;
  /** The free plan is lit up; the coming-soon one sits back a little. */
  highlighted: boolean;
  price: string;
  tagline: string;
  includedLabel: string;
  features: readonly string[];
  action: ReactNode;
  /** Its place in the row, for the staggered entrance. */
  index: number;
  testId: string;
}

/** One plan: badge, name, price, what it includes and its call to action. */
export function PlanCard({ name, badge, highlighted, price, tagline, includedLabel, features, action, index, testId }: Readonly<PlanCardProps>) {
  const titleId = useId();
  const rise = useCanObserve() ? { initial: { opacity: 0, y: 32 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 } } : {};
  return (
    <Box
      component={motion.section}
      aria-labelledby={titleId}
      {...rise}
      transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      data-testid={testId}
      sx={(theme: Theme) => ({
        position: 'relative',
        p: { xs: 3, md: 4 },
        borderRadius: `${LITE_RADII.cover}px`,
        border: 2,
        borderColor: highlighted ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: highlighted ? `0 24px 60px ${tint(theme.palette.primary.main, 0.25)}` : 'none',
        opacity: highlighted ? 1 : 0.92,
      })}
    >
      <Stack spacing={2.5} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography id={titleId} component="h2" variant="h3">
            {name}
          </Typography>
          <Chip label={badge} color={highlighted ? 'primary' : 'default'} size="small" variant={highlighted ? 'filled' : 'outlined'} />
        </Stack>
        <Typography component="p" sx={{ fontWeight: 800, fontSize: { xs: '2.2rem', md: '2.6rem' }, lineHeight: 1.1 }}>
          {price}
        </Typography>
        <Typography color="text.secondary">{tagline}</Typography>
        <Stack spacing={1} sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" component="h3">
            {includedLabel}
          </Typography>
          <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {features.map((feature) => (
              <Stack component="li" key={feature} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <CheckCircleIcon fontSize="small" color={highlighted ? 'primary' : 'disabled'} aria-hidden sx={{ mt: 0.25 }} />
                <Typography variant="body2">{feature}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
        {action}
      </Stack>
    </Box>
  );
}
