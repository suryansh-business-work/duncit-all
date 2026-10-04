import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { processedLabel, type RefundSection } from './refundParts';
import type { RefundPart } from './queries';

interface Props {
  section: RefundSection;
  busy: boolean;
  onProcess: (part: RefundPart) => void;
}

/** One box of the Refund breakup — a way the booking was paid (or the
 * earned-coin revocation): its paid / deduction / refund lines and its own
 * action, processed independently of the other boxes. */
export default function RefundPartAccordion({ section, busy, onProcess }: Readonly<Props>) {
  const { t } = useTranslation();
  const done = !!section.processedAt;
  const id = `refund-part-${section.part.toLowerCase().replaceAll('_', '-')}`;
  const actionLabel =
    section.part === 'EARN_REVOKE'
      ? t('finance.backoutRefund.revokeCoins')
      : t('finance.backoutRefund.processRefund');
  return (
    <Accordion defaultExpanded disableGutters variant="outlined" data-testid={id}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-content`} id={`${id}-header`}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0, mr: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }}>
            {section.title}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            color={done ? 'success' : 'warning'}
            label={processedLabel(section.processedAt, t)}
          />
          <Typography variant="subtitle2">{section.summary}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails id={`${id}-content`}>
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
          <Stack spacing={0.5} divider={<Divider flexItem />}>
            {section.lines.map((line) => (
              <Stack key={line.key} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: line.bold ? 700 : 400 }}>
                  {line.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: line.bold ? 700 : 400 }}>
                  {line.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        {!done && section.blockedReason && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {section.blockedReason}
          </Alert>
        )}
        {!done && (
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
            <DuncitButton
              size="small"
              color="warning"
              variant="contained"
              data-testid={`${id}-action`}
              disabled={busy || !!section.blockedReason}
              onClick={() => onProcess(section.part)}
            >
              {busy ? t('finance.backoutRefund.processing') : actionLabel}
            </DuncitButton>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
