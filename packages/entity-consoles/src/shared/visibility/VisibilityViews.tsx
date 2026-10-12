import { Alert, Chip, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { isPodHidden, type PodVisibilityFields } from './queries';

interface ToggleProps {
  /** The record's own flag: true offers Show, false offers Hide. */
  hidden: boolean;
  onClick: () => void;
}

/** The row action. The icon is what pressing it will DO, as its tooltip says. */
export function VisibilityIconButton({ hidden, onClick }: Readonly<ToggleProps>) {
  const { t } = useTranslation();
  return (
    <Tooltip title={hidden ? t('directory.visibility.show') : t('directory.visibility.hide')}>
      <DuncitIconButton size="small" onClick={onClick}>
        {hidden ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
      </DuncitIconButton>
    </Tooltip>
  );
}

/** The same action as a page-header button. */
export function VisibilityButton({ hidden, onClick }: Readonly<ToggleProps>) {
  const { t } = useTranslation();
  return (
    <DuncitButton
      variant="outlined"
      color={hidden ? 'primary' : 'warning'}
      startIcon={hidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
      onClick={onClick}
    >
      {hidden ? t('directory.visibility.show') : t('directory.visibility.hide')}
    </DuncitButton>
  );
}

/** "Hidden", with the reason on hover. Renders nothing for a visible record. */
export function HiddenChip({ hidden, reason }: Readonly<{ hidden: boolean; reason?: string | null }>) {
  const { t } = useTranslation();
  if (!hidden) return null;
  return (
    <Tooltip title={reason ?? ''}>
      <Chip size="small" color="warning" label={t('directory.visibility.hiddenChip')} />
    </Tooltip>
  );
}

/**
 * A pod's hidden state as one chip: hidden on its own, or only with its club.
 * Its own flag wins the label, because that is the one this pod's Show undoes.
 */
export function PodHiddenChip({ pod }: Readonly<{ pod: PodVisibilityFields }>) {
  const { t } = useTranslation();
  if (!isPodHidden(pod)) return null;
  if (pod.is_hidden) return <HiddenChip hidden reason={pod.hidden_reason} />;
  return (
    <Tooltip title={pod.club_hidden_reason ?? ''}>
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label={t('directory.visibility.hiddenWithClubChip')}
      />
    </Tooltip>
  );
}

/** What the export and quick search read for the same cell. */
export function podVisibilityValue(pod: PodVisibilityFields, t: (key: string) => string): string {
  if (pod.is_hidden) return t('directory.visibility.hiddenChip');
  if (pod.hidden_by_club) return t('directory.visibility.hiddenWithClubChip');
  return t('directory.visibility.visible');
}

function Reason({ reason }: Readonly<{ reason?: string | null }>) {
  const { t } = useTranslation();
  if (!reason) return null;
  return (
    <Typography variant="body2" component="div">
      {t('directory.visibility.reasonPrefix', { vars: { reason } })}
    </Typography>
  );
}

/** The first thing a reader of a hidden pod's page is told, with why. */
export function PodHiddenBanner({ pod }: Readonly<{ pod: PodVisibilityFields }>) {
  const { t } = useTranslation();
  if (!isPodHidden(pod)) return null;
  if (!pod.is_hidden) {
    return (
      <Alert severity="warning">
        {t('directory.visibility.podHiddenWithClubBanner')}
        <Reason reason={pod.club_hidden_reason} />
      </Alert>
    );
  }
  return (
    <Alert severity="warning">
      {t('directory.visibility.podHiddenBanner')}
      <Reason reason={pod.hidden_reason} />
      {pod.hidden_by_club && (
        <Typography variant="body2" component="div">
          {t('directory.visibility.alsoHiddenWithClub')}
        </Typography>
      )}
    </Alert>
  );
}

/** The same, on a hidden club's page. */
export function ClubHiddenBanner({ hidden, reason }: Readonly<{ hidden: boolean; reason?: string | null }>) {
  const { t } = useTranslation();
  if (!hidden) return null;
  return (
    <Alert severity="warning">
      {t('directory.visibility.clubHiddenBanner')}
      <Reason reason={reason} />
    </Alert>
  );
}
