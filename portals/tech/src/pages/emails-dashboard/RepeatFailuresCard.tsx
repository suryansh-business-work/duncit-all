import {
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDateTime } from '../server/format';
import type { EmailLogFailingAddress } from './queries';
import { useTranslation } from '@duncit/app-settings';

/**
 * An address that fails once is an incident; one that fails every time is a
 * dead mailbox nobody has noticed, and it will keep costing sends until someone
 * looks at the reason attached to it.
 */
export default function RepeatFailuresCard({
  rows,
}: Readonly<{ rows: EmailLogFailingAddress[] }>) {
  const { t } = useTranslation();
  return (
    <Card sx={{ flex: 1, minWidth: 280 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Addresses failing repeatedly
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No address failed more than once in this range.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('tech.emailsDashboard.address')}</TableCell>
                <TableCell align="right">{t('tech.emailsDashboard.failures')}</TableCell>
                <TableCell>{t('tech.emailsDashboard.lastReason')}</TableCell>
                <TableCell>When</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.address}>
                  <TableCell>
                    <Typography variant="body2" noWrap title={r.address}>
                      {r.address}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="error" variant="outlined" label={r.failures} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" title={r.last_reason} sx={{
                      color: "text.secondary"
                    }}>
                      {r.last_reason}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {formatDateTime(r.last_failed_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
