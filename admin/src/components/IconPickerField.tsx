import { useMemo } from 'react';
import * as MuiIcons from '@mui/icons-material';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface Props {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  helperText?: string;
}

/**
 * Curated list of MUI icon names suitable for category/super-category icons.
 * Rendered dynamically — only the icons in this list are tree-shaken into
 * the admin bundle (we never `import *` from @mui/icons-material at runtime
 * for the picker — we look the names up against the named exports).
 */
const ICON_NAMES: string[] = [
  'Pets', 'SportsSoccer', 'SportsCricket', 'SportsTennis', 'SportsBasketball',
  'SportsVolleyball', 'SportsBaseball', 'SportsRugby', 'SportsHandball',
  'SportsHockey', 'SportsGolf', 'SportsKabaddi', 'SportsMartialArts',
  'SportsMma', 'SportsEsports', 'FitnessCenter', 'Pool', 'DirectionsBike',
  'DirectionsRun', 'DirectionsWalk', 'Hiking', 'Surfing', 'Skateboarding',
  'Kayaking', 'Sailing', 'Snowboarding', 'DownhillSkiing', 'Paragliding',
  'Restaurant', 'LocalCafe', 'LocalBar', 'Fastfood', 'LocalPizza',
  'EmojiFoodBeverage', 'IceSkating', 'NightlifeOutlined', 'TheaterComedy',
  'MusicNote', 'Mic', 'Headphones', 'Movie', 'Photo', 'CameraAlt',
  'Brush', 'Palette', 'ColorLens', 'School', 'MenuBook', 'AutoStories',
  'Computer', 'Code', 'Devices', 'Phonelink', 'Memory', 'Cloud',
  'Public', 'TravelExplore', 'Flight', 'DirectionsCar', 'TwoWheeler',
  'TrainOutlined', 'DirectionsBoat', 'Rocket', 'Star', 'StarBorder',
  'Favorite', 'FavoriteBorder', 'EmojiEvents', 'EmojiNature', 'EmojiPeople',
  'Group', 'Groups', 'Diversity3', 'Forum', 'ChatBubble', 'Mood',
  'Spa', 'SelfImprovement', 'HealthAndSafety', 'LocalHospital',
  'MedicalServices', 'Vaccines', 'Psychology', 'Work', 'BusinessCenter',
  'Storefront', 'ShoppingBag', 'ShoppingCart', 'AttachMoney', 'Savings',
  'AccountBalance', 'Home', 'Bed', 'Chair', 'Pets', 'Festival',
  'Celebration', 'Cake', 'CardGiftcard', 'Park', 'Forest', 'Yard',
  'BeachAccess', 'WbSunny', 'NightsStay', 'Bolt', 'Pets',
  'EmojiObjects', 'Lightbulb', 'Build', 'Construction', 'Handyman',
  'Kitchen', 'LocalLaundryService', 'CleaningServices', 'PetsOutlined',
];

const UNIQUE_NAMES = Array.from(new Set(ICON_NAMES));

function resolveIcon(name: string): SvgIconComponent | null {
  if (!name) return null;
  const Comp = (MuiIcons as Record<string, SvgIconComponent>)[name];
  return typeof Comp === 'function' ? Comp : null;
}

export function renderIconByName(
  name: string | null | undefined,
  fontSize: 'small' | 'medium' | 'large' = 'small'
) {
  if (!name) return null;
  const Comp = resolveIcon(name);
  if (!Comp) return null;
  return <Comp fontSize={fontSize} />;
}

export default function IconPickerField({
  value,
  onChange,
  label = 'Icon',
  helperText = 'Pick a Material icon, or paste an emoji.',
}: Props) {
  const known = useMemo(() => UNIQUE_NAMES, []);
  const isKnown = !!resolveIcon(value);

  return (
    <Autocomplete
      freeSolo
      options={known}
      value={value || ''}
      onChange={(_e, v) => onChange((v as string) || '')}
      onInputChange={(_e, v, reason) => {
        if (reason === 'input') onChange(v);
      }}
      renderOption={(props, option) => {
        const Comp = resolveIcon(option);
        return (
          <Box component="li" {...props} sx={{ display: 'flex', gap: 1.25 }}>
            {Comp ? <Comp fontSize="small" /> : <span style={{ width: 20 }}>·</span>}
            <Typography variant="body2">{option}</Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={
            isKnown ? `Material icon: ${value}` : helperText
          }
          InputProps={{
            ...params.InputProps,
            startAdornment: isKnown ? (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                {renderIconByName(value, 'small')}
              </Box>
            ) : value ? (
              <Box sx={{ pl: 1, fontSize: 18 }}>{value}</Box>
            ) : null,
          }}
        />
      )}
    />
  );
}
