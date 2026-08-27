import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Tooltip } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
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
        <DuncitIconButton size="small" color={active ? 'default' : 'success'} onClick={onToggleActive}>
          <PowerSettingsNewIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {canHardDelete && (
        <Tooltip title={t('onboarding.lifecycleActions.deletePermanentlyDeveloper')}>
          <DuncitIconButton size="small" color="error" onClick={onDelete}>
            <DeleteForeverIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
    </>
  );
}
