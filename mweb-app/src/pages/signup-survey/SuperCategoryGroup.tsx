import { Box, Card, CardContent, Stack, Typography, alpha } from '@mui/material';
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
    <Card
      sx={{
        overflow: 'hidden',
        border: `1.5px solid ${alpha(hue, 0.25)}`,
        background: `linear-gradient(180deg, ${alpha(hue, 0.06)} 0%, #ffffff 60%)`,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 8,
                height: 28,
                borderRadius: 999,
                backgroundColor: hue,
              }}
            />
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                borderRadius: 999,
                backgroundColor: alpha(hue, 0.12),
                color: hue,
                fontWeight: 800,
                letterSpacing: 0.2,
                userSelect: 'none',
              }}
            >
              {emoji && (
                <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                  {emoji}
                </Box>
              )}
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'inherit' }}>
                {superCategory.name}
              </Typography>
            </Box>
          </Stack>

          {categories.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No interests in this group yet.
            </Typography>
          )}

          {categories.map((category) => {
            const subs = childrenByParent.get(category.id) ?? [];
            return (
              <Box key={category.id} sx={{ pl: { xs: 1, sm: 1.5 } }}>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: subs.length ? 1 : 0 }}>
                  <SurveyChip
                    id={category.id}
                    label={category.name}
                    icon={category.icon}
                    selected={selected.has(category.id)}
                    onToggle={onToggle}
                    size="medium"
                  />
                </Stack>
                {subs.length > 0 && (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    spacing={0.75}
                    sx={{ pl: { xs: 1.25, sm: 2 }, borderLeft: `2px dashed ${alpha(hue, 0.3)}`, ml: 0.5, py: 0.5 }}
                  >
                    {subs.map((sub) => (
                      <SurveyChip
                        key={sub.id}
                        id={sub.id}
                        label={sub.name}
                        icon={sub.icon}
                        selected={selected.has(sub.id)}
                        onToggle={onToggle}
                        size="small"
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
