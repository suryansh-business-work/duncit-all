import { Switch, Tooltip, Typography } from '@mui/material';
import type { PortalAppFeature, PortalAppRow } from '../queries';

/** Only a console mounts the shared header, so only a console has these two
 * buttons to offer — a website or the member app has neither. */
export const hasConsoleHeader = (row: PortalAppRow) => row.kind === 'PORTAL';

export type ToggleFeature = (row: PortalAppRow, feature: PortalAppFeature, next: boolean) => void;

interface FeatureCellProps {
  row: PortalAppRow;
  field: PortalAppFeature;
  headerName: string;
  busyKey?: string | null;
  naLabel: string;
  onLabel: string;
  offLabel: string;
  onToggle: ToggleFeature;
}

/** One switch cell. A row without a console header shows why instead. */
export default function FeatureCell({
  row,
  field,
  headerName,
  busyKey,
  naLabel,
  onLabel,
  offLabel,
  onToggle,
}: Readonly<FeatureCellProps>) {
  if (!hasConsoleHeader(row)) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {naLabel}
      </Typography>
    );
  }
  return (
    <Tooltip title={row[field] ? onLabel : offLabel}>
      <Switch
        checked={row[field]}
        disabled={busyKey === row.key}
        onChange={(e) => onToggle(row, field, e.target.checked)}
        slotProps={{
          input: { 'aria-label': `${headerName} — ${row.name}` }
        }}
      />
    </Tooltip>
  );
}
