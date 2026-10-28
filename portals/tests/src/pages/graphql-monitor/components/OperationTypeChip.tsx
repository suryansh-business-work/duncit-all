import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { operationTypeColor, operationTypeLabel } from '../labels';
import type { FieldUsage, OperationType } from '../queries';

interface Props {
  type: OperationType | FieldUsage['kind'];
}

export default function OperationTypeChip({ type }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      color={operationTypeColor(type)}
      label={operationTypeLabel(t, type)}
      data-testid={`graphql-monitor-type-${type.toLowerCase()}`}
    />
  );
}
