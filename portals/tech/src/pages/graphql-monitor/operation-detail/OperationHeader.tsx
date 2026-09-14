import { Link as RouterLink } from 'react-router';
import { Link, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from '@duncit/shell';
import MonitorHeader from '../components/MonitorHeader';
import OperationTypeChip from '../components/OperationTypeChip';
import { formatDateTime } from '../../server/format';
import type { MonitorRange, OperationDetail } from '../queries';

interface Props {
  operation: OperationDetail;
  range: MonitorRange;
  onRangeChange: (range: MonitorRange) => void;
}

/** Back to the list (keeping the range), then the operation's name and when it first appeared. */
export default function OperationHeader({ operation, range, onRangeChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Link
        component={RouterLink}
        to={`/graphql-monitor/operations?range=${range}`}
        underline="hover"
        data-testid="graphql-monitor-operation-back"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content' }}
      >
        <ArrowBackIcon fontSize="small" />
        {t('tech.graphqlMonitor.backToOperations')}
      </Link>
      <MonitorHeader
        title={operation.name}
        subtitle={t('tech.graphqlMonitor.operationSubtitle', {
          vars: { fields: operation.root_fields.join(', ') || '—', since: formatDateTime(operation.first_seen_at) },
        })}
        range={range}
        onRangeChange={onRangeChange}
        testId="graphql-monitor-operation"
        extra={<OperationTypeChip type={operation.type} />}
      />
    </Stack>
  );
}
