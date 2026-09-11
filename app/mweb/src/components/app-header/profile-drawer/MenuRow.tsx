import type { ReactNode } from 'react';
import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

type RowTone = 'default' | 'danger';

interface Props {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  /** A muted second line — only for information (the active studio). */
  secondary?: string;
  /** A small pill after the label, e.g. "Coming soon". */
  badge?: string;
  /** A control on the right (a switch, an expand arrow). */
  trailing?: ReactNode;
  /** The muted chevron that says "this opens somewhere". */
  chevron?: boolean;
  tone?: RowTone;
}

const ROW_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  width: '100%',
  minHeight: 60,
  px: 2,
  py: 1.5,
  textAlign: 'left',
} as const;

/**
 * One row of the menu's grouped lists: a 36px soft disc with the icon, the
 * label at 15/500, then a badge, a trailing control or the muted chevron.
 * Every menu row renders through this so the lists cannot drift. Native twin:
 * components/Sidebar/SidebarRow.
 */
export default function MenuRow({
  icon,
  label,
  onClick,
  secondary,
  badge,
  trailing,
  chevron = true,
  tone = 'default',
}: Readonly<Props>) {
  const ink = tone === 'danger' ? 'error.main' : 'text.primary';
  const content = (
    <>
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: ink,
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 15, fontWeight: 500, color: ink }}>
          {label}
        </Typography>
        {secondary ? (
          <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
            {secondary}
          </Typography>
        ) : null}
      </Box>
      {badge ? (
        <Chip
          label={badge}
          sx={{ height: 24, fontSize: 11, bgcolor: 'action.hover', color: 'secondary.main' }}
        />
      ) : null}
      {trailing}
      {chevron ? <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} /> : null}
    </>
  );
  if (!onClick) {
    return <Box sx={ROW_SX}>{content}</Box>;
  }
  return (
    <ButtonBase onClick={onClick} sx={{ ...ROW_SX, '&:hover': { bgcolor: 'action.hover' } }}>
      {content}
    </ButtonBase>
  );
}
