import { useState, type ReactNode } from 'react';
import { Alert, Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { EarningsStatement, StatementLine } from '@duncit/utils';

/** One auditable row: label + amount, with the formula that produced it
 * underneath. Context rows (the taxable base) render muted, not bold. */
function ChargeRow({ line, money }: Readonly<{ line: StatementLine; money: (n: number) => string }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ px: 1.5, py: 0.75 }}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography variant="body2" color={line.deduction ? 'text.primary' : 'text.secondary'}>
          {line.label}
        </Typography>
        <Typography variant="body2" fontWeight={line.deduction ? 700 : 500}>
          {money(line.amount)}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" component="div">
        {t('mweb.createPod.formula', { vars: { formula: line.formula } })}
      </Typography>
    </Box>
  );
}

interface SectionProps {
  title: string;
  amount: string;
  tint: string;
  /** Always-visible error under the header (the venue-shortfall rule). */
  error?: string | null;
  children: ReactNode;
}

/** One collapsible charge section — a real button header with a rotating chevron. */
function ChargeSection({ title, amount, tint, error, children }: Readonly<SectionProps>) {
  const [open, setOpen] = useState(false);
  return (
    <Box
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: tint,
        ...(error ? { border: '1px solid', borderColor: 'error.main' } : null),
      }}
    >
      <ButtonBase
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        sx={{ width: '100%', px: 1.5, py: 1, justifyContent: 'space-between', textAlign: 'left' }}
      >
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="body2" fontWeight={600}>
            {amount}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Stack>
      </ButtonBase>
      {error && (
        <Alert severity="error" sx={{ mx: 0.5, mb: 0.5 }} data-testid="price-panel-venue-error">
          {error}
        </Alert>
      )}
      <Collapse in={open} unmountOnExit>
        <Box sx={{ bgcolor: 'background.paper', mx: 0.5, mb: 0.5, borderRadius: '16px' }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

/** Section background: the failing venue section wins, then the venue's own
 * warning tint, then the neutral info tint. */
function sectionTint(theme: Theme, isVenue: boolean, hasError: boolean): string {
  if (hasError) return alpha(theme.palette.error.main, 0.12);
  if (isVenue) return alpha(theme.palette.warning.main, 0.1);
  return alpha(theme.palette.info.main, 0.08);
}

interface Props {
  statement: EarningsStatement;
  money: (value: number) => string;
  /** Set when the pod value does not cover the venue's slot price — paints the
   * Venue Charges section red and states the rule inside it. */
  venueError?: string | null;
}

/**
 * "Govt. and other charges" — the auditable deductions tree. Every section
 * keeps its subtotal on the header; every row carries the exact formula the
 * server used, so each value can be verified by hand.
 */
export default function ChargesAccordion({ statement, money, venueError }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <Box
      data-testid="price-panel-charges"
      sx={{
        border: '1px solid',
        borderColor: venueError ? 'error.main' : 'divider',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <ButtonBase
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        sx={{ width: '100%', px: 1.5, py: 1.25, justifyContent: 'space-between', textAlign: 'left' }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <ReceiptLongOutlinedIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>
            {t('mweb.createPod.govtCharges')}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            {money(statement.total_deductions)}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Stack>
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
          {statement.sections.map((section) => {
            const isVenue = section.key === 'venue';
            const error = isVenue ? venueError ?? null : null;
            return (
              <ChargeSection
                key={section.key}
                title={section.title}
                amount={money(section.total)}
                tint={sectionTint(theme, isVenue, !!error)}
                error={error}
              >
                {section.lines.map((line) => (
                  <ChargeRow key={line.key} line={line} money={money} />
                ))}
              </ChargeSection>
            );
          })}
          <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, pt: 0.5 }}>
            <Typography variant="body2" fontWeight={600}>
              {t('mweb.createPod.totalDeductions')}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {money(statement.total_deductions)}
            </Typography>
          </Stack>
          {!statement.reconciled && (
            <Alert severity="warning" data-testid="price-panel-reconcile-warning">
              {t('mweb.createPod.reconcileWarning')}
            </Alert>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
