import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  title: string;
  /** Right-hand link text, e.g. "See all". Needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * A section's title row: the title on the left, an optional accent "See all"
 * on the right. One look for every rail and list on every page. Native twin:
 * components/SectionHeader.
 */
export default function SectionHeader({ title, actionLabel, onAction }: Readonly<Props>) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 600, minWidth: 0 }} noWrap>
        {title}
      </Typography>
      {actionLabel && onAction ? (
        <DuncitButton
          size="small"
          color="secondary"
          onClick={onAction}
          sx={{ flexShrink: 0, px: 1, minHeight: 32 }}
        >
          {actionLabel}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}
