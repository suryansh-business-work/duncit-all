import { Box, Stack, Typography, alpha } from '@mui/material';
import { SurveyChip } from './SurveyChip';
import { colorForId, emojiFromIcon } from './surveyPalette';

export interface SurveyCategory {
  id: string;
  name: string;
  icon?: string | null;
  parent_id?: string | null;
}

export interface SuperCategoryGroupProps {
  superCategory: SurveyCategory;
  childrenByParent: Map<string | null, SurveyCategory[]>;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function SuperCategoryGroup({
  superCategory,
  childrenByParent,
  selected,
  onToggle,
}: SuperCategoryGroupProps) {
  const hue = colorForId(superCategory.id);
  const categories = childrenByParent.get(superCategory.id) ?? [];
  const emoji = emojiFromIcon(superCategory.icon);

  return (
    <Box
      sx={(t) => ({
        borderRadius: 4,
        p: { xs: 1.5, sm: 2 },
        border: `1.5px solid ${alpha(hue, 0.22)}`,
        background:
          t.palette.mode === 'dark'
            ? `radial-gradient(circle at 20% 15%, ${alpha(hue, 0.18)}, transparent 34%), ${t.palette.background.paper}`
            : `radial-gradient(circle at 18% 12%, ${alpha(hue, 0.16)}, transparent 34%), linear-gradient(180deg, ${alpha(hue, 0.06)} 0%, ${t.palette.background.paper} 70%)`,
      })}
    >
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            alignSelf: 'flex-start',
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            backgroundColor: alpha(hue, 0.12),
            color: hue,
            fontWeight: 800,
            userSelect: 'none',
          }}
        >
          {emoji && <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{emoji}</Box>}
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'inherit' }}>
            {superCategory.name}
          </Typography>
        </Box>

        {categories.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No interests in this group yet.
          </Typography>
        )}

        <Stack direction="row" flexWrap="wrap" justifyContent="center" useFlexGap spacing={1.15}>
          {categories.flatMap((category) => [category, ...(childrenByParent.get(category.id) ?? [])]).map((item, index) => (
            <SurveyChip
              key={item.id}
              id={item.id}
              label={item.name}
              icon={item.icon}
              selected={selected.has(item.id)}
              onToggle={onToggle}
              size={index % 3 === 0 ? 'large' : 'medium'}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
