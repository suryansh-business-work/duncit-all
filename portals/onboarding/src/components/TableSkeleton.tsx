import { Skeleton, Table, TableBody, TableCell, TableRow } from '@mui/material';

interface Props {
  rows?: number;
  columns: number;
}

// Stable keys generated outside the render map (no array-index keys).
const keys = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${i}`);

/** Placeholder rows shown while a table's data loads — a calmer loader than a
 *  bare spinner, matching the table's shape. */
export default function TableSkeleton({ rows = 6, columns }: Readonly<Props>) {
  const rowKeys = keys(rows, 'row');
  const colKeys = keys(columns, 'col');
  return (
    <Table size="small">
      <TableBody>
        {rowKeys.map((rowKey) => (
          <TableRow key={rowKey}>
            {colKeys.map((colKey) => (
              <TableCell key={colKey}>
                <Skeleton variant="text" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
