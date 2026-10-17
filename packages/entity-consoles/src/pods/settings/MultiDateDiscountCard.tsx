import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { TicketDiscountField } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  adminMultiDateDiscountLabels,
  multiDateTiersForEditor,
  multiDateTiersFromEditor,
  TICKET_DISCOUNT_MAX_TIERS,
  ticketDiscountTierIssues,
  type MultiDateDiscountTier,
  type TicketDiscountTier,
} from '@duncit/utils';

interface Props {
  loading: boolean;
  /** Saved default (null until the query resolves). */
  value: MultiDateDiscountTier[] | null;
  /** The most dates a recurring pod may have — the last tier cannot ask for more. */
  maxDates: number;
  /** The ceiling every pod discount tier lives under (multi-ticket's). */
  maxPct: number;
  onSave: (next: MultiDateDiscountTier[]) => Promise<void>;
}

/**
 * The multi-date booking discount a new recurring pod starts with: the shared
 * tier editor, counted in dates, with its own Save. A host may change it while
 * creating the pod; this is only where it starts. Switched off saves none.
 */
export default function MultiDateDiscountCard({ loading, value, maxDates, maxPct, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => adminMultiDateDiscountLabels(t), [t]);
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<TicketDiscountTier[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    setEnabled(value.length > 0);
    setTiers(multiDateTiersForEditor(value));
  }, [value]);

  const next = enabled ? tiers : [];
  const issues = ticketDiscountTierIssues({ enabled, tiers, maxPct, maxTickets: maxDates });
  const dirty = value !== null && JSON.stringify(multiDateTiersForEditor(value)) !== JSON.stringify(next);
  const limits = { maxPct, maxTickets: maxDates, maxTiers: TICKET_DISCOUNT_MAX_TIERS };
  const rowError = (index: number, field: 'min_tickets' | 'discount_pct') => {
    const issue = issues.find((i) => i.index === index && i.field === field);
    return issue ? labels.errors[issue.code](limits) : undefined;
  };
  const listIssue = issues.find((i) => i.index === null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSave(multiDateTiersFromEditor(next));
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="pod-settings-multi-date-discount">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1">{t('admin.podSettings.multiDateTitle')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.podSettings.multiDateDesc')}
            </Typography>
          </Box>
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={submit}
            disabled={busy || !dirty || loading || issues.length > 0}
            data-testid="pod-settings-multi-date-save"
          >
            {busy ? t('admin.podSettings.saving') : t('admin.podSettings.save')}
          </DuncitButton>
        </Stack>
        <TicketDiscountField
          enabled={enabled}
          tiers={tiers}
          onEnabledChange={setEnabled}
          onTiersChange={setTiers}
          maxPct={maxPct}
          maxTickets={maxDates}
          labels={labels}
          disabled={loading || busy}
          errors={{
            list: listIssue ? labels.errors[listIssue.code](limits) : undefined,
            rows: tiers.map((_, index) => ({
              min_tickets: rowError(index, 'min_tickets'),
              discount_pct: rowError(index, 'discount_pct'),
            })),
          }}
        />
        {err && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {err}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
