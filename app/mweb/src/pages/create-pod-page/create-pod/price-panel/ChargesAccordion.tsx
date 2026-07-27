import { useState, type ReactNode } from 'react';
import { Alert, Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import type { EarningsStatement, StatementLine } from '@duncit/utils';

/** One auditable row: label + amount, with the formula that produced it
 * underneath. Context rows (the taxable base) render muted, not bold. */
function ChargeRow({ line, money }: Readonly<{ line: StatementLine; money: (n: number) => string }>) {
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
        Formula: {line.formula}
      </Typography>
    </Box>
  );
}

interface SectionProps {
  title: string;
  amount: string;
  tint: string;
  children: ReactNode;
}

/** One collapsible charge section — a real button header with a rotating chevron. */
function ChargeSection({ title, amount, tint, children }: Readonly<SectionProps>) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: tint }}>
      <ButtonBase
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        sx={{ width: '100%', px: 1.5, py: 1, justifyContent: 'space-between', textAlign: 'left' }}
      >
        <Typography variant="body2" fontWeight={800}>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="body2" fontWeight={800}>
            {amount}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Stack>
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ bgcolor: 'background.paper', mx: 0.5, mb: 0.5, borderRadius: 1.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

interface Props {
  statement: EarningsStatement;
  money: (value: number) => string;
}

/**
 * "Govt. and other charges" — the auditable deductions tree. Every section
 * keeps its subtotal on the header; every row carries the exact formula the
 * server used, so each value can be verified by hand.
 */
export default function ChargesAccordion({ statement, money }: Readonly<Props>) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);

  return (
    <Box
      data-testid="price-panel-charges"
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}
    >
      <ButtonBase
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        sx={{ width: '100%', px: 1.5, py: 1.25, justifyContent: 'space-between', textAlign: 'left' }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <ReceiptLongOutlinedIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={900}>
            Govt. and other charges
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={900}>
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
          {statement.sections.map((section) => (
            <ChargeSection
              key={section.key}
              title={section.title}
              amount={money(section.total)}
              tint={
                section.key === 'venue'
                  ? alpha(theme.palette.warning.main, 0.1)
                  : alpha(theme.palette.info.main, 0.08)
              }
            >
              {section.lines.map((line) => (
                <ChargeRow key={line.key} line={line} money={money} />
              ))}
            </ChargeSection>
          ))}
          <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, pt: 0.5 }}>
            <Typography variant="body2" fontWeight={800}>
              Total deductions
            </Typography>
            <Typography variant="body2" fontWeight={900}>
              {money(statement.total_deductions)}
            </Typography>
          </Stack>
          {!statement.reconciled && (
            <Alert severity="warning" data-testid="price-panel-reconcile-warning">
              These figures do not reconcile — refresh, or contact support if this persists.
            </Alert>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
