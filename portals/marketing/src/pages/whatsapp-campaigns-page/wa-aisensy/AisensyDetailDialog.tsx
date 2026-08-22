import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import DetailField from '../../marketing-campaigns-page/DetailField';
import type { AisensyTemplate } from '../queries';
import TemplateSample from './TemplateSample';
import { statusKey } from './helpers';
import { useTranslation } from '@duncit/app-settings';

export interface AisensyFact {
  label: string;
  value: string;
  hint?: string;
}

interface Props {
  /** Null closes it — the row that was clicked owns the open state. */
  title: string | null;
  status: string;
  statusColors: StatusColorMap;
  facts: AisensyFact[];
  /** The template whose body is drawn as the sample; null when unknown. */
  template: AisensyTemplate | null;
  /** Why there is no sample — only reachable where a row can lack a template. */
  missingNote?: string;
  onClose: () => void;
}

/**
 * What one AiSensy row actually is: its facts, then the message itself drawn
 * the way WhatsApp will draw it. Campaigns and templates share this dialog —
 * a campaign IS its template plus a status, so two dialogs would only be two
 * places for the same preview to drift.
 */
export default function AisensyDetailDialog({
  title,
  status,
  statusColors,
  facts,
  template,
  missingNote = 'AiSensy returned no message body for this row.',
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!title) return null;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {title}
          </Typography>
          {status && (
            <StatusChip
              status={statusKey(status)}
              label={status}
              colorMap={statusColors}
              sx={{ fontWeight: 800 }}
            />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            }}
          >
            {facts.map((fact) => (
              <DetailField
                key={fact.label}
                label={fact.label}
                value={fact.value}
                hint={fact.hint}
              />
            ))}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              How it arrives
            </Typography>
            {template ? (
              <TemplateSample template={template} />
            ) : (
              <Alert severity="info">{missingNote}</Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
