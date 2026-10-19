import { Box, Checkbox, FormControlLabel, IconButton } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useTranslation } from '../../../../i18n/useTranslation';
import { testIdProps } from '../../../../utils/testIdProps';
import { profileIcon } from '../profileIcons';
import type { MenuEntry } from '../profileSections';

interface Props {
  entry: MenuEntry;
  /** Position among the picked tiles; ignored while unpicked. */
  index: number;
  picked: boolean;
  pickedCount: number;
  /** Six are picked — an unpicked option cannot be added. */
  full: boolean;
  onToggle: () => void;
  onMove: (step: -1 | 1) => void;
}

/** One destination in the Quick Access editor: a checkbox to pick or unpick
 * it and, while picked, buttons that move it up or down the grid. Native twin:
 * Sidebar/QuickAccessEditorRow. */
export default function QuickAccessOption({ entry, index, picked, pickedCount, full, onToggle, onMove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 52 }}>
      <FormControlLabel
        sx={{ flex: 1, minWidth: 0, mr: 0 }}
        disabled={!picked && full}
        control={
          <Checkbox
            checked={picked}
            onChange={onToggle}
            slotProps={{ input: testIdProps(`quick-access-option-${entry.key}`) }}
          />
        }
        label={
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box component="span" aria-hidden sx={{ display: 'flex', color: 'secondary.main', '& svg': { fontSize: 20 } }}>
              {profileIcon(entry.icon)}
            </Box>
            <Box component="span" sx={{ fontSize: 15, fontWeight: 500 }}>
              {entry.label}
            </Box>
          </Box>
        }
      />
      {picked ? (
        <>
          <IconButton
            data-testid={`quick-access-up-${entry.key}`}
            aria-label={t('mweb.sidebar.editorMoveUp', { vars: { label: entry.label } })}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <IconButton
            data-testid={`quick-access-down-${entry.key}`}
            aria-label={t('mweb.sidebar.editorMoveDown', { vars: { label: entry.label } })}
            disabled={index === pickedCount - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        </>
      ) : null}
    </Box>
  );
}
