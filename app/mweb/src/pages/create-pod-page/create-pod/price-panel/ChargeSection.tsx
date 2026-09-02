import { useState, type ReactNode } from 'react';
import { Alert, Box, ButtonBase, Collapse, IconButton, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { StatementLine } from '@duncit/utils';

/** One auditable row: label + amount, with the formula that produced it
 * underneath. Context rows (the taxable base) render muted, not bold. */
export function ChargeRow({ line, money }: Readonly<{ line: StatementLine; money: (n: number) => string }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ px: 1.5, py: 0.75 }}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" color={line.deduction ? 'text.primary' : 'text.secondary'}>
          {line.label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: line.deduction ? 700 : 500 }}>
          {money(line.amount)}
        </Typography>
      </Stack>
      <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
        {t('mweb.createPod.formula', { vars: { formula: line.formula } })}
      </Typography>
    </Box>
  );
}

interface SectionProps {
  title: string;
  /** Why this charge exists — revealed by the section's info button. */
  description: string;
  amount: string;
  tint: string;
  /** Names the section's controls, so a test can address one section's info
   * button: `price-panel-taxes-group-info`. Same ids as the native twin. */
  testId: string;
  /** Always-visible error under the header (the venue-shortfall rule). */
  error?: string | null;
  children: ReactNode;
}

/**
 * One collapsible charge section: a real button header with a rotating chevron,
 * and beside it an info button that opens the reason the charge exists.
 *
 * The info control is a SIBLING of the header button, never a child of it —
 * a button inside a button is invalid markup, and the two do different things:
 * the header opens the arithmetic, the info button opens the justification.
 * Both are toggles, so both carry their own `aria-expanded`.
 */
export function ChargeSection({
  title,
  description,
  amount,
  tint,
  testId,
  error,
  children,
}: Readonly<SectionProps>) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: tint,
        border: '1px solid',
        borderColor: error ? 'error.main' : 'divider',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', pr: 0.75 }}>
        <ButtonBase
          onClick={() => setOpen((value) => !value)}
          data-testid={testId}
          aria-expanded={open}
          sx={{ flex: 1, px: 1.5, py: 1.25, justifyContent: 'space-between', textAlign: 'left' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {amount}
            </Typography>
            <ExpandMoreIcon
              fontSize="small"
              sx={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
            />
          </Stack>
        </ButtonBase>
        <IconButton
          size="small"
          onClick={() => setInfo((value) => !value)}
          aria-expanded={info}
          aria-label={t('earnings.statement.whyThisCharge')}
          data-testid={`${testId}-info`}
          sx={{ color: info ? 'primary.main' : 'text.secondary' }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Collapse in={info} unmountOnExit>
        <Box
          data-testid={`${testId}-description`}
          sx={{ mx: 0.5, mb: 0.5, px: 1.25, py: 1, borderRadius: '16px', bgcolor: 'background.paper' }}
        >
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        </Box>
      </Collapse>
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
export function sectionTint(theme: Theme, isVenue: boolean, hasError: boolean): string {
  if (hasError) return alpha(theme.palette.error.main, 0.12);
  if (isVenue) return alpha(theme.palette.warning.main, 0.1);
  return alpha(theme.palette.info.main, 0.08);
}
