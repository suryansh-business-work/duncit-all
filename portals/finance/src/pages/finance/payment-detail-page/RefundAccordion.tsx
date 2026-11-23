import { Accordion, AccordionDetails, AccordionSummary, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { money, type PaymentRefundEntry, type PaymentRefundSection } from './queries';
import { REFUND_STATE_COLORS, refundKindTitles, refundStateLabels } from './refundLabels';
import RefundEntryCard from './RefundEntryCard';
import RefundEventList from './RefundEventList';

interface Props {
  section: PaymentRefundSection;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
  onRefund: (section: PaymentRefundSection, entry: PaymentRefundEntry) => void;
}

/** The headline figure: the cash, the coins, or both. */
function figureOf(section: PaymentRefundSection, currencySymbol: string, coinsText: string): string {
  const parts = [section.amount > 0 ? money(currencySymbol, section.amount) : '', section.coins > 0 ? coinsText : ''];
  return parts.filter(Boolean).join(' · ');
}

/**
 * One kind of refund as an accordion. A refund that is still owed (yellow) or
 * refused (red) opens by itself, so the thing that needs a person is never
 * behind a click; one that is back with the buyer stays folded. The colour is
 * never the only signal: the chip says the state in words.
 */
export default function RefundAccordion({ section, currencySymbol, formatDateTime, onRefund }: Readonly<Props>) {
  const { t } = useTranslation();
  const id = `payment-refund-${section.kind.toLowerCase().replaceAll('_', '-')}`;
  const tone = REFUND_STATE_COLORS[section.state];
  const title = refundKindTitles(t)[section.kind];

  return (
    <Accordion
      defaultExpanded={section.state !== 'COMPLETED'}
      disableGutters
      variant="outlined"
      slotProps={{ heading: { component: 'h3' } }}
      data-testid={id}
      data-state={section.state}
      sx={(theme) =>
        section.state === 'COMPLETED'
          ? {}
          : {
              backgroundColor: alpha(theme.palette[tone].main, 0.1),
              borderColor: theme.palette[tone].main,
            }
      }
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-content`} id={`${id}-header`}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flex: 1, minWidth: 0, mr: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 160 }}>
            {title}
          </Typography>
          <Chip size="small" variant="outlined" color={tone} label={refundStateLabels(t)[section.state]} />
          <Typography variant="subtitle2">
            {figureOf(section, currencySymbol, t('finance.payment.refundArea.coinsCount', { vars: { n: section.coins } }))}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails id={`${id}-content`}>
        <Stack spacing={2.5}>
          {section.entries.map((entry) => (
            <RefundEntryCard
              key={entry.id}
              entry={entry}
              currencySymbol={currencySymbol}
              formatDateTime={formatDateTime}
              onRefund={(row) => onRefund(section, row)}
            />
          ))}
        </Stack>
        <RefundEventList events={section.events} formatDateTime={formatDateTime} />
      </AccordionDetails>
    </Accordion>
  );
}
