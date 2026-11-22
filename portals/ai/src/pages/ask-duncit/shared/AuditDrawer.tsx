import { useLazyQuery } from '@apollo/client/react';
import { Alert, Box, Drawer, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { usd } from '../../../lib/usd';
import { ASK_DUNCIT_VERIFY_AUDIT } from './queries';
import type { AuditRow } from './types';

interface Props {
  row: AuditRow | null;
  onClose: () => void;
  onOpenConversation: (id: string) => void;
}

function Field({ label, value }: Readonly<{ label: string; value: string | number | null | undefined }>) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

/** One audit row in full: who, what, the model and tokens, the tool and its masked arguments. */
export default function AuditDrawer({ row, onClose, onOpenConversation }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [verify, verified] = useLazyQuery<{ askDuncitVerifyAudit: boolean }>(ASK_DUNCIT_VERIFY_AUDIT, { fetchPolicy: 'network-only' });
  const result = verified.data?.askDuncitVerifyAudit;

  return (
    <Drawer anchor="right" open={Boolean(row)} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, p: 2 } } }}>
      {row && (
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {row.violation_kind ?? row.type}
          </Typography>
          {!row.intact && <Alert severity="error">{t('ai.askDuncit.tampered')}</Alert>}
          <Field label={t('ai.askDuncit.col.when')} value={formatDateTime(row.created_at)} />
          <Field label={t('ai.askDuncit.col.user')} value={`${row.user_name || '—'} (${row.user_id ?? '—'})`} />
          <Field label={t('ai.askDuncit.col.role')} value={`${row.role_key} · ${row.account_roles.join(', ')}`} />
          <Field label={t('ai.askDuncit.field.source')} value={[row.surface, row.locale, row.page_route, row.entity_type && `${row.entity_type} ${row.entity_id}`].filter(Boolean).join(' · ')} />
          <Field label={t('ai.askDuncit.field.query')} value={row.query} />
          <Field label={t('ai.askDuncit.field.response')} value={row.response} />
          <Field label={t('ai.askDuncit.col.model')} value={row.model && `${row.model} · ${row.total_tokens} · ${usd(row.cost_usd)} · ${row.latency_ms} ms`} />
          <Field label={t('ai.askDuncit.field.tool')} value={row.tool} />
          <Field label={t('ai.askDuncit.field.toolArgs')} value={row.tool_args} />
          <Field label={t('ai.askDuncit.field.reason')} value={row.reason} />
          <Field label={t('ai.askDuncit.field.error')} value={[row.error_code, row.error_message].filter(Boolean).join(': ')} />
          <Field label={t('ai.askDuncit.field.detail')} value={row.detail} />
          <Stack direction="row" spacing={1}>
            {row.conversation_id && (
              <DuncitButton variant="outlined" size="small" onClick={() => onOpenConversation(row.conversation_id as string)}>
                {t('ai.askDuncit.openConversation')}
              </DuncitButton>
            )}
            <DuncitButton variant="text" size="small" onClick={() => { verify({ variables: { id: row.id } }).catch(() => undefined); }}>
              {t('ai.askDuncit.verify')}
            </DuncitButton>
          </Stack>
          {result !== undefined && <Alert severity={result ? 'success' : 'error'}>{t(result ? 'ai.askDuncit.verifyOk' : 'ai.askDuncit.tampered')}</Alert>}
        </Stack>
      )}
    </Drawer>
  );
}
