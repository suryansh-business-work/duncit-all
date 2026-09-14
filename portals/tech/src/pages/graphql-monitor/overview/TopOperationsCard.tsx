import { List, ListItemButton, ListItemText, Typography } from '@mui/material';
import SectionCard from '../../stress-testing/components/SectionCard';
import OperationTypeChip from '../components/OperationTypeChip';
import type { OperationSummary } from '../queries';

interface Props {
  title: string;
  subtitle: string;
  emptyText: string;
  operations: readonly OperationSummary[];
  metric: (operation: OperationSummary) => string;
  onOpen: (operation: OperationSummary) => void;
  testId: string;
}

/** Five operations ranked by one measure, each opening its own page. */
export default function TopOperationsCard({ title, subtitle, emptyText, operations, metric, onOpen, testId }: Readonly<Props>) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {operations.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid={`${testId}-empty`}>
          {emptyText}
        </Typography>
      ) : (
        <List dense disablePadding data-testid={testId}>
          {operations.map((operation) => (
            <ListItemButton
              key={operation.id}
              onClick={() => onOpen(operation)}
              data-testid={`${testId}-${operation.id}`}
              sx={{ gap: 1, borderRadius: 1 }}
            >
              <OperationTypeChip type={operation.type} />
              <ListItemText
                primary={operation.name}
                slotProps={{ primary: { noWrap: true, title: operation.name, variant: 'body2', sx: { fontWeight: 600 } } }}
                sx={{ minWidth: 0 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                {metric(operation)}
              </Typography>
            </ListItemButton>
          ))}
        </List>
      )}
    </SectionCard>
  );
}
