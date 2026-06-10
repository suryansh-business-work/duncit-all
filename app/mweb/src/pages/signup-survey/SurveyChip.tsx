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
  small: { height: 42, fontSize: 12.5, paddingX: 1.5 },
  medium: { height: 48, fontSize: 13.5, paddingX: 1.9 },
  large: { height: 56, fontSize: 15, paddingX: 2.35 },
} as const;

export function SurveyChip({
  id,
  label,
  icon,
  selected,
  onToggle,
  size = 'medium',
  color,
}: Readonly<SurveyChipProps>) {
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
        minWidth: size === 'large' ? 112 : 92,
        touchAction: 'manipulation',
        cursor: 'pointer',
        transition: 'all 180ms ease',
        backgroundColor: selected ? hue : alpha(hue, 0.1),
        color: selected ? '#fff' : hue,
        border: `1.5px solid ${selected ? hue : alpha(hue, 0.4)}`,
        boxShadow: selected
          ? `0 10px 24px -10px ${alpha(hue, 0.7)}`
          : `0 8px 18px -14px ${alpha(hue, 0.5)}`,
        '&:hover': {
          backgroundColor: selected ? hue : alpha(hue, 0.18),
          transform: 'translateY(-1px)',
        },
        '& .MuiChip-label': { px: 0 },
      }}
    />
  );
}
