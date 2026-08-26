import { Box, Stack, Typography, alpha } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DraftRow from './DraftRow';
import { useTranslation } from '../../i18n/useTranslation';
import type { DraftRowData } from './drafts';

interface ExpiringDraftsPanelProps {
  drafts: DraftRowData[];
  onDelete: (id: string) => void;
}

/**
 * The info-badge section that leads the drafts list: every draft the retention
 * sweep deletes within the next 24 hours, soonest first, so the host sees what
 * they are about to lose before anything else.
 */
export default function ExpiringDraftsPanel({
  drafts,
  onDelete,
}: Readonly<ExpiringDraftsPanelProps>) {
  const { t } = useTranslation();

  return (
    <Box
      data-testid="drafts-expiring-panel"
      sx={{
        p: 1.25,
        mb: 1.5,
        borderRadius: '16px',
        border: 1,
        borderColor: 'warning.main',
        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 1.25 }}>
        <InfoOutlinedIcon color="warning" fontSize="small" sx={{ mt: '2px' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('mweb.hostManage.draftsExpiringSoon')} ({drafts.length})
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.hostManage.draftsExpiringSoonNote')}
          </Typography>
        </Box>
      </Stack>
      <Stack spacing={1}>
        {drafts.map((draft) => (
          <DraftRow key={draft.id} draft={draft} expiring onDelete={onDelete} />
        ))}
      </Stack>
    </Box>
  );
}
