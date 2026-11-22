import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import AuditTable from '../shared/AuditTable';
import PageHeader from '../shared/PageHeader';

/**
 * Ask Duncit › Security & Access Violations — prompt-injection attempts (direct,
 * in files, in tool results), unauthorized tool and data access, privilege
 * escalation, and rate/quota refusals.
 */
export default function AskDuncitViolationsPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.violations.title')} subtitle={t('ai.askDuncit.violations.subtitle')} />
      <AuditTable preset="VIOLATIONS" tableId="ai.askDuncit.violations" />
    </Box>
  );
}
