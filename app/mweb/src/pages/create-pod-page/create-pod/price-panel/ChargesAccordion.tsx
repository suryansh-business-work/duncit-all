import { useState } from 'react';
import { Alert, Box, ButtonBase, Collapse, Divider, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';
import { ChargeRow, ChargeSection, sectionTint } from './ChargeSection';
import type { EarningsStatement } from '@duncit/utils';

interface Props {
  statement: EarningsStatement;
  money: (value: number) => string;
  /** Set when the pod value does not cover the venue's slot price — paints the
   * Venue Charges section red and states the rule inside it. */
  venueError?: string | null;
}

/**
 * "Govt. and other charges" — the auditable deductions tree. Every section
 * keeps its subtotal on the header, carries an info button explaining why the
 * charge exists, and every row carries the exact formula the server used, so
 * each value can be verified by hand.
 *
 * The sections are spaced and bordered rather than stacked flush: four charges
 * with different payees reading as one continuous list was the reason a host
 * could not tell where the venue's money ended and Duncit's began.
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ReceiptLongOutlinedIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('mweb.createPod.govtCharges')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {money(statement.total_deductions)}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Stack>
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Stack spacing={1.75} sx={{ px: 1, pt: 0.5, pb: 1.25 }}>
          {statement.sections.map((section) => {
            const isVenue = section.key === 'venue';
            const error = isVenue ? venueError ?? null : null;
            return (
              <ChargeSection
                key={section.key}
                title={section.title}
                description={section.description}
                amount={money(section.total)}
                tint={sectionTint(theme, isVenue, !!error)}
                testId={`price-panel-${section.key}-group`}
                error={error}
              >
                {section.lines.map((line) => (
                  <ChargeRow key={line.key} line={line} money={money} />
                ))}
              </ChargeSection>
            );
          })}
          <Divider sx={{ mt: 0.5 }} />
          <Stack direction="row" sx={{ justifyContent: 'space-between', px: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('mweb.createPod.totalDeductions')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
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
