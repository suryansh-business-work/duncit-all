import { Box, Skeleton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { renderSuperCategoryMark } from './superCategoryIcon';

interface Props {
  loading: boolean;
  superCats: any[];
  value: string;
  onChange: (slug: string) => void;
}

export default function SuperCategoryTabs({ loading, superCats, value, onChange }: Props) {
  if (loading && superCats.length === 0) {
    return (
      <Box sx={{ px: 1.5, pb: 0.75 }}>
        <Skeleton variant="rounded" height={36} />
      </Box>
    );
  }
  if (superCats.length === 0) return null;
  return (
    <Box sx={{ px: 1.5, pb: 0.75 }}>
      <ToggleButtonGroup
        value={value}
        exclusive
        fullWidth
        size="small"
        onChange={(_e, next) => {
          if (next) onChange(next);
        }}
        sx={{
          width: '100%',
          '& .MuiToggleButton-root': {
            minWidth: 0,
            flex: 1,
            minHeight: 44,
            px: 0.75,
            gap: 0.5,
            fontSize: 12,
            whiteSpace: 'nowrap',
          },
        }}
      >
        {superCats.map((c: any) => (
          <ToggleButton key={c.id} value={c.slug} aria-label={c.name}>
            {renderSuperCategoryMark(c.icon)}
            <Box
              component="span"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {c.name}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
