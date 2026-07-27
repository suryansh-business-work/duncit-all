import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import type { EarningsWaterfall } from './queries';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ChargeLine {
  label: string;
  value: number;
}

/** The two nested charge groups + their totals, grouped exactly as settled:
 * platform-side lines vs the venue-side lines. Without a venue the Duncit
 * commission joins the platform group (there is no venue group to carry it). */
export function buildChargeGroups(w: EarningsWaterfall, hasVenue: boolean) {
  const gstLines: ChargeLine[] = [
    { label: `GST (${w.gst_pct}%)`, value: w.gst_amount },
    { label: `Platform Fee (${w.platform_fee_pct}%)`, value: w.platform_fee_amount },
  ];
  if (w.club_admin_amount > 0) {
    gstLines.push({ label: `Club Admin (${w.club_admin_pct}%)`, value: w.club_admin_amount });
  }
  if (!hasVenue) {
    gstLines.push({
      label: `Duncit Commission (${w.host_commission_pct}%)`,
      value: w.host_commission_amount,
    });
  }
  const venueLines: ChargeLine[] = hasVenue
    ? [
        { label: 'Venue slot price', value: w.venue_amount },
        {
          label: `Duncit Commission from Venue (${w.host_commission_pct}%)`,
          value: w.host_commission_amount,
        },
      ]
    : [];
  const sum = (lines: ChargeLine[]) => round2(lines.reduce((total, line) => total + line.value, 0));
  return {
    gstLines,
    venueLines,
    gstTotal: sum(gstLines),
    venueTotal: sum(venueLines),
    totalDeductions: round2(w.amount - w.host_receives),
  };
}

function ChargeRow({ label, value, money }: Readonly<{ label: string; value: number; money: (n: number) => string }>) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ px: 1.5, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        • {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {money(value)}
      </Typography>
    </Stack>
  );
}

interface SectionProps {
  title: string;
  amount: string;
  tint: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** One collapsible charge group — a real button header with a rotating chevron. */
function ChargeSection({ title, amount, tint, defaultOpen = false, children }: Readonly<SectionProps>) {
  const [open, setOpen] = useState(defaultOpen);
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
  waterfall: EarningsWaterfall;
  hasVenue: boolean;
  money: (value: number) => string;
}

/** "Govt. and other charges" — the collapsible deductions tree between the
 * collection line and the payout card. Group totals stay visible on the
 * headers, so the full charge picture reads without opening anything. */
export default function ChargesAccordion({ waterfall, hasVenue, money }: Readonly<Props>) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const groups = buildChargeGroups(waterfall, hasVenue);

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
            {money(groups.totalDeductions)}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Stack>
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
          <ChargeSection
            title="1. GST and other charges"
            amount={money(groups.gstTotal)}
            tint={alpha(theme.palette.info.main, 0.08)}
          >
            {groups.gstLines.map((line) => (
              <ChargeRow key={line.label} label={line.label} value={line.value} money={money} />
            ))}
          </ChargeSection>
          {hasVenue && (
            <ChargeSection
              title="2. Venue charges"
              amount={money(groups.venueTotal)}
              tint={alpha(theme.palette.warning.main, 0.1)}
            >
              {groups.venueLines.map((line) => (
                <ChargeRow key={line.label} label={line.label} value={line.value} money={money} />
              ))}
            </ChargeSection>
          )}
          <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, pt: 0.5 }}>
            <Typography variant="body2" fontWeight={800}>
              Total deductions
            </Typography>
            <Typography variant="body2" fontWeight={900}>
              {money(groups.totalDeductions)}
            </Typography>
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
