import { Box, Skeleton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import { renderSuperCategoryMark } from './superCategoryIcon';

interface Props {
  loading: boolean;
  superCats: any[];
  value: string;
  onChange: (slug: string) => void;
}

export default function SuperCategoryTabs({ loading, superCats, value, onChange }: Props) {
  const { pathname } = useLocation();
  const canFilter = ['/', '/explore', '/clubs', '/chats', '/follow'].includes(pathname);
  const selectedIndex = Math.max(superCats.findIndex((c: any) => c.slug === value), 0);
  const selectedWidth = `${100 / Math.max(superCats.length, 1)}%`;

  if (!canFilter) return null;

  if (loading && superCats.length === 0) {
    return (
      <Box sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', px: 1.5, pb: 0.75 }}>
        <Skeleton variant="rounded" height={36} />
      </Box>
    );
  }
  if (superCats.length === 0) return null;
  return (
    <Box sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', px: 1.25, pb: 1 }}>
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
          p: 0,
          borderRadius: 3.5,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            insetBlock: 0,
            left: 0,
            width: selectedWidth,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 58%, #f5337a 100%)',
            boxShadow: '0 10px 24px rgba(245,51,122,0.24)',
            transform: `translateX(${selectedIndex * 100}%)`,
            transition: 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          },
          '& .MuiToggleButton-root': {
            minWidth: 0,
            flex: 1,
            minHeight: 40,
            px: 0.75,
            gap: 0.5,
            fontSize: 12,
            whiteSpace: 'nowrap',
            border: 0,
            borderRadius: '14px !important',
            fontWeight: 900,
            color: 'text.secondary',
            zIndex: 1,
            transition: 'color 180ms ease, transform 180ms ease',
          },
          '& .MuiToggleButton-root.Mui-selected': {
            color: 'primary.contrastText',
            background: 'transparent',
            transform: 'translateY(-0.5px)',
          },
          '& .MuiToggleButton-root.Mui-selected:hover': {
            background: 'transparent',
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
