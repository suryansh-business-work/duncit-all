import { Box, Card, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import type { MembershipPlanData } from './queries';

interface Props {
  plans: readonly MembershipPlanData[];
}

/** One tier's card. Hoisted to module scope (S6478) and given the accent as a
 * prop, so the row below stays a plain map. The tier's own admin-set colour
 * marks its name; the card itself is the calm surface. */
function PlanCard({ plan, ctaHint }: Readonly<{ plan: MembershipPlanData; ctaHint: string }>) {
  const accent = plan.accent_color || undefined;
  return (
    <Card
      sx={{
        minWidth: 232,
        maxWidth: 232,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: 2,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: accent ?? 'primary.main' }}>
          {plan.name}
        </Typography>
        {plan.badge_label && (
          <Chip size="small" label={plan.badge_label} sx={{ height: 22, fontSize: 11, bgcolor: 'action.hover' }} />
        )}
      </Stack>

      <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.15 }}>
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
          <DuncitButton fullWidth variant="outlined" disabled>
            {plan.cta_label}
          </DuncitButton>
        </Box>
      </Tooltip>
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
