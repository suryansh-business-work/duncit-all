import SyncIcon from '@mui/icons-material/Sync';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { reload } from '../lib/actions';

/** Re-reads one panel's query; named for what it refreshes. */
export default function RefreshButton({ refetch, label }: Readonly<{ refetch: () => Promise<unknown>; label: string }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton aria-label={t('ecommPortal.common.refreshNamed', { vars: { name: label } })} onClick={() => reload(refetch)}>
      <SyncIcon fontSize="small" />
    </DuncitIconButton>
  );
}
