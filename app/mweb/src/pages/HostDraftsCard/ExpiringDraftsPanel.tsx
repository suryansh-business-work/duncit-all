import { Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DraftRow from './DraftRow';
import RowGroup from '../host-manage-page/RowGroup';
import { useTranslation } from '../../i18n/useTranslation';
import type { DraftRowData } from './drafts';

interface ExpiringDraftsPanelProps {
  drafts: DraftRowData[];
  onDelete: (id: string) => void;
}

/**
 * The warning card that leads the drafts list: every draft the retention
 * sweep deletes within the next 24 hours, soonest first, so the host sees what
 * they are about to lose before anything else.
 */
export default function ExpiringDraftsPanel({
  drafts,
  onDelete,
}: Readonly<ExpiringDraftsPanelProps>) {
  const { t } = useTranslation();

  return (
    <RowGroup borderColor="warning.main" testId="drafts-expiring-panel">
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 2, py: 1.5 }}>
        <InfoOutlinedIcon color="warning" fontSize="small" />
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          {t('mweb.hostManage.draftsExpiringSoon')} ({drafts.length})
        </Typography>
      </Stack>
      {drafts.map((draft) => (
        <DraftRow key={draft.id} draft={draft} expiring onDelete={onDelete} />
      ))}
    </RowGroup>
  );
}
