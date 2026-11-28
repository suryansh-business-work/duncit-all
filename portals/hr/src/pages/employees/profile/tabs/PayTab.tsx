import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { formatDay } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { HR_COMPENSATION_REASON_KEYS, formatCurrency, type HrCompensationRecord } from '@duncit/utils';
import PayTotals from '../../fields/PayTotals';
import PayLinesTable from './PayLinesTable';

interface Props {
  current: HrCompensationRecord | null;
  revisions: readonly HrCompensationRecord[];
  onWithdraw: (compensationId: string) => Promise<boolean>;
}

/** The pay in force today, and every revision — upcoming ones can be withdrawn before they start. */
export default function PayTab({ current, revisions, onWithdraw }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const withdraw = async (revision: HrCompensationRecord) => {
    const message = t('hrEmployee.pay.withdrawConfirm', { vars: { date: formatDay(revision.effective_from) } });
    if (await confirm({ title: t('hrEmployee.pay.withdraw'), message, confirmLabel: t('hrEmployee.pay.withdraw'), destructive: true })) {
      await onWithdraw(revision.id);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <SectionCard title={t('hrEmployee.pay.current')} subtitle={current ? t('hrEmployee.pay.effective', { vars: { date: formatDay(current.effective_from) } }) : undefined}>
        {current ? (
          <Stack spacing={2}>
            <PayTotals totals={current.totals} currency={current.currency} />
            <PayLinesTable lines={current.components} currency={current.currency} />
          </Stack>
        ) : (
          <Typography variant="body2">{t('hrEmployee.pay.none')}</Typography>
        )}
      </SectionCard>
      {revisions.length > 0 && (
        <SectionCard title={t('hrEmployee.pay.history')}>
          {revisions.map((revision) => (
            <Accordion key={revision.id} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`pay-${revision.id}`} id={`pay-${revision.id}-header`}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDay(revision.effective_from)}</Typography>
                  <Typography variant="body2">{t(HR_COMPENSATION_REASON_KEYS[revision.reason])}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatCurrency(revision.totals.annual_ctc, revision.currency)}
                  </Typography>
                  {revision.is_current && <Chip size="small" color="success" label={t('hrEmployee.pay.current')} />}
                  {revision.is_upcoming && <Chip size="small" color="warning" label={t('hrEmployee.pay.upcoming')} />}
                </Stack>
              </AccordionSummary>
              <AccordionDetails id={`pay-${revision.id}`}>
                <Stack spacing={2}>
                  <PayLinesTable lines={revision.components} currency={revision.currency} />
                  {revision.note && <Typography variant="body2">{revision.note}</Typography>}
                  {revision.is_upcoming && (
                    <div>
                      <DuncitButton color="error" onClick={() => fireAndForget(withdraw(revision), logs.portal.hr, 'PayTab', 'withdraw')} data-testid={`hr-pay-withdraw-${revision.id}`}>
                        {t('hrEmployee.pay.withdraw')}
                      </DuncitButton>
                    </div>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </SectionCard>
      )}
    </Box>
  );
}
