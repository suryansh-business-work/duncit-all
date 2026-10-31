import { useId, useState, type ReactNode } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { ReelAsset } from '../../types';
import MediaThumb from '../MediaThumb';

export interface AddOption {
  id: string;
  label: string;
  /** The footage it adds; null for an option that adds none (a colour card, no music). */
  asset: ReelAsset | null;
}

interface Props {
  label: string;
  icon: ReactNode;
  options: readonly AddOption[];
  /** Shown as the only, disabled, entry when there is nothing to add. */
  emptyText: string;
  disabled?: boolean;
  onPick: (asset: ReelAsset | null) => void;
  testId: string;
}

/** A toolbar button that opens a list of the reel's footage to add from. */
export default function AddMenu({ label, icon, options, emptyText, disabled, onPick, testId }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const close = () => setAnchor(null);

  return (
    <>
      <DuncitButton
        size="small"
        startIcon={icon}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? menuId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid={testId}
      >
        {label}
      </DuncitButton>
      <Menu id={menuId} anchorEl={anchor} open={anchor !== null} onClose={close}>
        {options.length === 0 && <MenuItem disabled>{emptyText}</MenuItem>}
        {options.map((option) => (
          <MenuItem
            key={option.id}
            onClick={() => {
              close();
              onPick(option.asset);
            }}
            data-testid={`${testId}-${option.id}`}
          >
            {option.asset && (
              <ListItemIcon>
                <MediaThumb kind={option.asset.kind} src={option.asset.thumbnail_url} size={28} />
              </ListItemIcon>
            )}
            <ListItemText primary={option.label} slotProps={{ primary: { noWrap: true } }} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
