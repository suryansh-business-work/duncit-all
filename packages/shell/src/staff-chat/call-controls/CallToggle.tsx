import { Tooltip } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';

interface Props {
  title: string;
  /** Also the accessible name: the tooltip is not read by every reader. */
  label: string;
  on: boolean;
  onColor?: 'error' | 'primary';
  disabled?: boolean;
  onClick: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
}

/**
 * One on/off control in the call row.
 *
 * Every one of these was the same eleven lines with two words changed, and each
 * copy was another place for the pressed state and the label to drift apart.
 */
export default function CallToggle({
  title,
  label,
  on,
  onColor = 'error',
  disabled,
  onClick,
  onIcon,
  offIcon,
}: Readonly<Props>) {
  return (
    <Tooltip title={title}>
      {/* A disabled button fires no events, so the tooltip needs a live wrapper. */}
      <span>
        <DuncitIconButton
          size="small"
          color={on ? onColor : 'inherit'}
          aria-label={label}
          aria-pressed={on}
          disabled={disabled}
          onClick={onClick}
        >
          {on ? onIcon : offIcon}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}
