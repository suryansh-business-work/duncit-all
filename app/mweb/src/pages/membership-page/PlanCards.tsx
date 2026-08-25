import { Box, Button, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import type { MembershipPlanData } from './queries';

interface Props {
  plans: readonly MembershipPlanData[];
}

/** One tier's card. Hoisted to module scope (S6478) and given the accent as a
 * prop, so the row below stays a plain map. */
function PlanCard({ plan, ctaHint }: Readonly<{ plan: MembershipPlanData; ctaHint: string }>) {
  const accent = plan.accent_color || undefined;
  return (
    <Card
      variant="outlined"
      sx={{
        minWidth: 232,
        maxWidth: 232,
        flexShrink: 0,
        borderTop: 3,
        borderTopColor: accent ?? 'primary.main',
        display: 'flex',
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 800, letterSpacing: 1, color: accent ?? 'primary.main' }}
          >
            {plan.name}
          </Typography>
          {plan.badge_label && <Chip size="small" label={plan.badge_label} />}
        </Stack>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            lineHeight: 1.1
          }}>
          {plan.price_label}
        </Typography>
        {plan.price_note && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {plan.price_note}
          </Typography>
        )}
        {plan.tagline && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 0.5,
              flex: 1
            }}>
            {plan.tagline}
          </Typography>
        )}

        {/* Disabled while membership is coming soon. A disabled MUI button
            swallows pointer events, so the tooltip needs a wrapper to hang on. */}
        <Tooltip title={ctaHint}>
          <Box sx={{ mt: 1.25 }}>
            <Button fullWidth size="small" variant="outlined" disabled>
              {plan.cta_label}
            </Button>
          </Box>
        </Tooltip>
      </CardContent>
    </Card>
  );
}

/** The tier cards as one horizontally scrolling rail — five columns never fit a
 * phone, and stacking them buries the comparison table below the fold. */
export default function PlanCards({ plans }: Readonly<Props>) {
  const { t } = useTranslation();
  const ctaHint = t('mweb.membership.ctaDisabledHint');
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        overflowX: 'auto',
        pb: 1,
        // The rail scrolls; the page body never does (artifact of `overflow-x`
        // on the container rather than on the page).
        scrollSnapType: 'x mandatory',
        '& > *': { scrollSnapAlign: 'start' },
      }}
    >
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} ctaHint={ctaHint} />
      ))}
    </Stack>
  );
}
