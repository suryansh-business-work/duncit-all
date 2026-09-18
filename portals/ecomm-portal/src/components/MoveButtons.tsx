import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface MoveButtonsProps {
  /** Names the row in each button's accessible name ("Move Dogs up"). */
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** The row's other controls (edit, delete, remove), drawn after the arrows. */
  children?: ReactNode;
}

/** Up / down arrows for a hand-ordered row, followed by the row's own controls. */
export default function MoveButtons({
  name,
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
  children,
}: Readonly<MoveButtonsProps>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
      <DuncitIconButton
        aria-label={t('ecommPortal.list.moveUp', { vars: { name } })}
        disabled={disabled || !canMoveUp}
        onClick={onMoveUp}
      >
        <ArrowUpwardIcon fontSize="small" />
      </DuncitIconButton>
      <DuncitIconButton
        aria-label={t('ecommPortal.list.moveDown', { vars: { name } })}
        disabled={disabled || !canMoveDown}
        onClick={onMoveDown}
      >
        <ArrowDownwardIcon fontSize="small" />
      </DuncitIconButton>
      {children}
    </Stack>
  );
}
