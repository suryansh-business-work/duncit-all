import { CircularProgress, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  icon: React.ReactNode;
  label: string;
  /** The button's accessible name; the visible label under it is often a count. */
  ariaLabel?: string;
  /** Count shown under the disc (join spots, likes, comments). Label-only
   * actions (save, share, open) carry no caption — the icon says it. */
  caption?: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
  tooltip?: string;
  /** Optional separate tap on the count/label (e.g. like count → who-liked list). */
  onLabelClick?: () => void;
  testId?: string;
}

/** The count under the disc; `clickable` when it opens something. */
const captionSx = (clickable: boolean) => (theme: Theme) => ({
  border: 0,
  p: 0,
  bgcolor: 'transparent',
  color: 'common.white',
  fontWeight: 600,
  fontSize: '0.6875rem',
  textShadow: `0 1px 6px ${alpha(theme.palette.common.black, 0.45)}`,
  cursor: clickable ? 'pointer' : 'default',
});

export default function ExploreActionButton({
  icon,
  ariaLabel,
  caption,
  onClick,
  active,
  loading,
  tooltip,
  onLabelClick,
  testId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  let captionNode: React.ReactNode = null;
  if (caption && onLabelClick) {
    // A count that opens something (who liked) is a real button (2.1.1).
    captionNode = (
      <Typography
        data-testid={`${testId}-count`}
        variant="caption"
        component="button"
        aria-label={t('mweb.a11y.seeLikes', { vars: { count: caption } })}
        onClick={onLabelClick}
        sx={captionSx(true)}
      >
        {caption}
      </Typography>
    );
  } else if (caption) {
    captionNode = (
      <Typography variant="caption" sx={captionSx(false)}>
        {caption}
      </Typography>
    );
  }
  return (
    <Stack data-testid={testId} spacing={0.25} sx={{
      alignItems: "center"
    }}>
      <DuncitIconButton
        onClick={onClick}
        disabled={loading}
        aria-label={ariaLabel}
        title={tooltip}
        sx={(theme) => ({
          width: 44,
          height: 44,
          minHeight: 44,
          bgcolor: active ? 'secondary.main' : alpha(theme.palette.common.black, 0.4),
          color: 'common.white',
          backdropFilter: 'blur(10px)',
          '&:hover': { bgcolor: active ? 'secondary.main' : alpha(theme.palette.common.black, 0.55) },
        })}
      >
        {loading ? <CircularProgress size={19} color="inherit" /> : icon}
      </DuncitIconButton>
      {captionNode}
    </Stack>
  );
}
