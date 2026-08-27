import type { MouseEvent, ReactNode } from 'react';
import { Tooltip } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';

interface Props {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onPress: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}

export function ToolbarButton({
  active = false,
  disabled = false,
  label,
  onPress,
  children,
}: Readonly<Props>) {
  return (
    <Tooltip title={label} enterDelay={500}>
      <span>
        <DuncitIconButton
          aria-label={label}
          aria-pressed={active}
          color={active ? 'primary' : 'default'}
          disabled={disabled}
          size="small"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={onPress}
          sx={{
            borderRadius: 1,
            color: active ? 'primary.main' : 'text.secondary',
          }}
        >
          {children}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}
