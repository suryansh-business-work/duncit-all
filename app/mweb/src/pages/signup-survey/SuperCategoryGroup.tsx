import { Box, Stack, Typography, alpha } from '@mui/material';
import { SURFACE_SX } from '../../theme';
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
}: Readonly<SuperCategoryGroupProps>) {
  const hue = colorForId(superCategory.id);
  const categories = childrenByParent.get(superCategory.id) ?? [];
  const emoji = emojiFromIcon(superCategory.icon);

  return (
    // A plain calm card; the group's own hue lives on its label pill and chips.
    <Box sx={{ ...SURFACE_SX, p: 2 }}>
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
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          {emoji && <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{emoji}</Box>}
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'inherit'
            }}>
            {superCategory.name}
          </Typography>
        </Box>

        {categories.length === 0 && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            No interests in this group yet.
          </Typography>
        )}

        <Stack
          direction="row"
          useFlexGap
          spacing={1.15}
          sx={{
            flexWrap: "wrap",
            justifyContent: "center"
          }}>
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
