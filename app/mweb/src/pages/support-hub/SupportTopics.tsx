import { Box, List, ListItemButton, Paper, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import type { FaqGroup } from './faqQueries';

interface SupportTopicsProps {
  groups: FaqGroup[];
}

/** "Topics" list — one row per FAQ super-category with its article count. */
export default function SupportTopics({ groups }: Readonly<SupportTopicsProps>) {
  const navigate = useNavigate();
  if (groups.length === 0) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 950 }}>
        Topics
      </Typography>
      <Paper variant="outlined" sx={{ mt: 0.5, borderRadius: 4, overflow: 'hidden' }}>
        <List disablePadding>
          {groups.map((group, index) => {
            const id = group.super_category?.id ?? 'GENERIC';
            const name = group.super_category?.name ?? 'General';
            const mark = group.super_category?.icon
              ? renderSuperCategoryMark(group.super_category.icon, 22)
              : null;
            return (
              <ListItemButton
                key={id}
                divider={index < groups.length - 1}
                onClick={() => navigate(`/faqs?cat=${id}`)}
                sx={{ px: 2, py: 1.35 }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    mr: 1.5,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    bgcolor: 'rgba(255,79,115,0.12)',
                  }}
                >
                  {mark ?? <HelpOutlineIcon fontSize="small" />}
                </Box>
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }} noWrap>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.faqs.length} {group.faqs.length === 1 ? 'article' : 'articles'}
                  </Typography>
                </Stack>
                <ChevronRightIcon fontSize="small" color="disabled" />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}
