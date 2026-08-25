import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { money, type PodFinanceBreakdown } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface WaterfallLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

interface WaterfallStep {
  key: string;
  title: string;
  amount: string;
  caption: string;
  lines?: WaterfallLine[];
}

type Translate = ReturnType<typeof useTranslation>['t'];

function buildSteps(breakdown: PodFinanceBreakdown, t: Translate): WaterfallStep[] {
  const w = breakdown.waterfall;
  const sym = breakdown.currency_symbol;
  const steps: WaterfallStep[] = [
    {
      key: 'customer-payment',
      title: '1. Customer Payment',
      amount: money(sym, w.amount),
      caption: `GST-inclusive amount collected across ${breakdown.bookings_count} bookings.`,
    },
    {
      key: 'gst',
      title: '2. GST (−)',
      amount: `− ${money(sym, w.gst_amount)}`,
      caption: `${w.gst_pct.toFixed(2)}% GST extracted from the GST-inclusive customer payment.`,
    },
    {
      key: 'platform-fee',
      title: '3. Platform Fee (−)',
      amount: `− ${money(sym, w.platform_fee_amount)}`,
      caption: `${w.platform_fee_pct.toFixed(2)}% platform fee on the net (post-GST) amount of ${money(sym, w.net_amount)}.`,
    },
    {
      key: 'pool',
      title: '4. Remaining Pool',
      amount: money(sym, w.pool_amount),
      caption: t('finance.podFinance.netAmountMinusThePlatformFee'),
    },
  ];
  if (w.club_admin_amount > 0) {
    steps.push({
      key: 'club-admin',
      title: '4b. Club Admin Cut (−)',
      amount: `− ${money(sym, w.club_admin_amount)}`,
      caption: `${w.club_admin_pct.toFixed(2)}% of the pool, paid to the club's admin on completion (booked inside Duncit revenue).`,
    });
  }
  if (breakdown.has_venue) {
    steps.push({
      key: 'venue',
      title: '5. Venue Amount',
      amount: money(sym, w.venue_amount),
      caption: t('finance.podFinance.theVenueSFixedBookedSlot'),
      lines: [
        {
          key: 'venue-commission',
          label: `− Venue Commission (${w.venue_commission_pct.toFixed(2)}%)`,
          value: `− ${money(sym, w.venue_commission_amount)}`,
        },
        { key: 'venue-receives', label: t('finance.podFinance.venueReceives'), value: money(sym, w.venue_receives) },
      ],
    });
  }
  steps.push(
    {
      key: 'host',
      title: '6. Host Amount',
      amount: money(sym, w.host_amount),
      caption: t('finance.podFinance.theHostKeepsThePoolRemainder'),
      lines: [
        {
          key: 'host-commission',
          label: `− Host Commission (${w.host_commission_pct.toFixed(2)}%)`,
          value: `− ${money(sym, w.host_commission_amount)}`,
        },
        { key: 'host-receives', label: t('finance.podFinance.hostReceives'), value: money(sym, w.host_receives), bold: true },
      ],
    },
    {
      key: 'duncit-revenue',
      title: '7. Duncit Total Revenue',
      amount: money(sym, w.duncit_revenue),
      caption: t('finance.podFinance.platformFeePlusTheCommissionsTaken'),
    },
    {
      key: 'gst-collected',
      title: '8. GST Collected (to government)',
      amount: money(sym, w.gst_amount),
      caption: t('finance.podFinance.gstHeldForRemittanceToThe'),
    },
  );
  return steps;
}

/** The pod money waterfall rendered as ordered MUI accordions with a
 * reconciliation footer that must add back up to the customer payment. */
export default function WaterfallAccordions({ breakdown }: Readonly<{ breakdown: PodFinanceBreakdown }>) {
  const { t } = useTranslation();
  const w = breakdown.waterfall;
  const sym = breakdown.currency_symbol;
  const total = w.gst_amount + w.host_receives + w.venue_receives + w.duncit_revenue;

  return (
    <Box>
      {buildSteps(breakdown, t).map((step) => (
        <Accordion key={step.key} disableGutters variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
                pr: 1
              }}>
              <Typography variant="body2" sx={{
                fontWeight: 700
              }}>{step.title}</Typography>
              <Typography variant="body2" sx={{
                fontWeight: 700
              }}>{step.amount}</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>{step.caption}</Typography>
            {step.lines?.map((line) => (
              <Stack
                key={line.key}
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  mt: 1,
                  pl: 2
                }}>
                <Typography variant="body2" sx={{
                  fontWeight: line.bold ? 700 : 400
                }}>{line.label}</Typography>
                <Typography variant="body2" sx={{
                  fontWeight: line.bold ? 700 : 400
                }}>{line.value}</Typography>
              </Stack>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
      <Divider sx={{ my: 1.5 }} />
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          px: 2
        }}>
        <Typography variant="body2" sx={{
          fontWeight: 800
        }}>{t('finance.podFinance.totalMatchesCustomerPayment')}</Typography>
        <Typography variant="body2" sx={{
          fontWeight: 800
        }}>{money(sym, total)}</Typography>
      </Stack>
    </Box>
  );
}
