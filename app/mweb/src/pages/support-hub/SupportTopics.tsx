import { Box, List, ListItemButton, Paper, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { useNavigate } from 'react-router';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import type { FaqGroup } from './faqQueries';
import { useTranslation } from '../../i18n/useTranslation';

interface SupportTopicsProps {
  groups: FaqGroup[];
}

/** "Topics" list — one row per FAQ super-category with its article count. */
export default function SupportTopics({ groups }: Readonly<SupportTopicsProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (groups.length === 0) return null;
  return (
    <Stack spacing={1.5}>
      <SectionHeader title={t('mweb.supportHub.topics')} />
      <Paper sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
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
                sx={{ px: 2, py: 1.75, borderRadius: 0 }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    mr: 1.5,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'secondary.main',
                    bgcolor: 'action.hover',
                    flexShrink: 0,
                  }}
                >
                  {mark ?? <HelpOutlineIcon fontSize="small" />}
                </Box>
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }} noWrap>
                    {name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {group.faqs.length} {group.faqs.length === 1 ? 'article' : 'articles'}
                  </Typography>
                </Stack>
                <ChevronRightRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>
    </Stack>
  );
}
