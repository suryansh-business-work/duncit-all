import { Box, Chip, alpha } from '@mui/material';
import { colorForId, emojiFromIcon } from './surveyPalette';

export interface SurveyChipProps {
  id: string;
  label: string;
  icon?: string | null;
  selected: boolean;
  onToggle: (id: string) => void;
  size?: 'small' | 'medium' | 'large';
  /** Override the auto-derived hue. */
  color?: string;
}

const SIZE_MAP = {
  small: { height: 30, fontSize: 12.5, paddingX: 1.25 },
  medium: { height: 36, fontSize: 13.5, paddingX: 1.75 },
  large: { height: 42, fontSize: 15, paddingX: 2.25 },
} as const;

export function SurveyChip({
  id,
  label,
  icon,
  selected,
  onToggle,
  size = 'medium',
  color,
}: SurveyChipProps) {
  const hue = color ?? colorForId(id);
  const emoji = emojiFromIcon(icon);
  const dims = SIZE_MAP[size];

  return (
    <Chip
      onClick={() => onToggle(id)}
      label={
        <Box
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
        >
          {emoji && (
            <Box component="span" sx={{ fontSize: dims.fontSize + 2, lineHeight: 1 }}>
              {emoji}
            </Box>
          )}
          <Box component="span">{label}</Box>
        </Box>
      }
      sx={{
        height: dims.height,
        fontSize: dims.fontSize,
        fontWeight: 700,
        borderRadius: 999,
        px: dims.paddingX,
        cursor: 'pointer',
        transition: 'all 180ms ease',
        backgroundColor: selected ? hue : alpha(hue, 0.1),
        color: selected ? '#fff' : hue,
        border: `1.5px solid ${selected ? hue : alpha(hue, 0.4)}`,
        boxShadow: selected
          ? `0 6px 14px -6px ${alpha(hue, 0.55)}`
          : 'none',
        '&:hover': {
          backgroundColor: selected ? hue : alpha(hue, 0.18),
          transform: 'translateY(-1px)',
        },
      }}
    />
  );
}
