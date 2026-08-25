import { Fragment } from 'react';
import { Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  groupMembershipBenefits,
  membershipCellKind,
  membershipCellValue,
  type MembershipBenefitRow,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { MembershipPlanData } from './queries';

interface Props {
  plans: readonly MembershipPlanData[];
  benefits: readonly MembershipBenefitRow[];
}

/** A cell drawn from its value: a tick, a dash, or the text as typed. Icons
 * come from the icon set, never a glyph in the data (rule 31). */
function BenefitCell({
  value,
  yesLabel,
  noLabel,
}: Readonly<{ value: string; yesLabel: string; noLabel: string }>) {
  const kind = membershipCellKind(value);
  if (kind === 'YES') {
    return <CheckCircleIcon fontSize="small" color="success" aria-label={yesLabel} />;
  }
  if (kind === 'NO') {
    return <RemoveIcon fontSize="small" sx={{ color: 'text.disabled' }} aria-label={noLabel} />;
  }
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
      {value}
    </Typography>
  );
}

const headCellSx = {
  fontWeight: 800,
  whiteSpace: 'nowrap' as const,
  textAlign: 'center' as const,
  bgcolor: 'background.paper',
};

/** The first column is sticky so a row's label stays readable while the tiers
 * scroll past it — with five columns, a phone can never show them all at once. */
const stickyCellSx = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  minWidth: 176,
};

export default function ComparisonTable({ plans, benefits }: Readonly<Props>) {
  const { t } = useTranslation();
  const groups = groupMembershipBenefits(benefits);
  const yesLabel = t('mweb.membership.included');
  const noLabel = t('mweb.membership.notIncluded');

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" sx={{
        fontWeight: 700
      }}>
        {t('mweb.membership.compareTitle')}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.membership.compareHint')}
      </Typography>

      <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: '16px' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, ...stickyCellSx, textAlign: 'left' }}>
                {t('mweb.membership.benefitColumn')}
              </TableCell>
              {plans.map((plan) => (
                <TableCell
                  key={plan.id}
                  sx={{ ...headCellSx, color: plan.accent_color || undefined }}
                >
                  {plan.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* A Fragment, not a nested <tbody> — TableBody already IS one, and
                a tbody inside a tbody is invalid markup the browser unwraps. */}
            {groups.map((group) => (
              <Fragment key={group.group}>
                <TableRow>
                  <TableCell
                    colSpan={plans.length + 1}
                    sx={{ bgcolor: 'action.hover', py: 0.75 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 800,
                        letterSpacing: 0.8
                      }}>
                      {group.group}
                    </Typography>
                  </TableCell>
                </TableRow>
                {group.rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={stickyCellSx}>
                      <Typography variant="body2" sx={{
                        fontWeight: 600
                      }}>
                        {row.label}
                      </Typography>
                    </TableCell>
                    {plans.map((plan) => (
                      <TableCell key={plan.id} align="center">
                        <BenefitCell
                          value={membershipCellValue(row, plan.key)}
                          yesLabel={yesLabel}
                          noLabel={noLabel}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.membership.footnote')}
      </Typography>
    </Stack>
  );
}
