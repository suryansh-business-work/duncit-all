import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  active: boolean;
  onToggleActive: () => void;
  canHardDelete: boolean;
  onDelete: () => void;
}

/** Deactivate/activate + developer-only permanent delete icons, appended to a
 * table row's Actions cell (Venues / Hosts / Brands). */
export default function LifecycleActions({ active, onToggleActive, canHardDelete, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Tooltip title={active ? 'Deactivate' : 'Activate'}>
        <IconButton size="small" color={active ? 'default' : 'success'} onClick={onToggleActive}>
          <PowerSettingsNewIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {canHardDelete && (
        <Tooltip title={t('onboarding.lifecycleActions.deletePermanentlyDeveloper')}>
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
