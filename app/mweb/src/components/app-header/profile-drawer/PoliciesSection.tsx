import { Fragment } from 'react';
import { useNavigate } from 'react-router';
import { Box, ButtonBase, Collapse, Divider, Skeleton, Stack, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '../../../i18n/useTranslation';
import MenuRow from './MenuRow';

interface PoliciesSectionProps {
  publicPolicies: { id: string; slug: string; title: string }[];
  /** The links are still in flight — hold the row rather than popping it in. */
  loading?: boolean;
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
}

/** Collapsible "Policies" row of the menu's settings group — opened, each
 * policy is an inset row under it. Native twin: Sidebar/SidebarPolicies. */
export default function PoliciesSection({
  publicPolicies,
  loading = false,
  policiesOpen,
  setPoliciesOpen,
}: Readonly<PoliciesSectionProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (loading) {
    return (
      <Stack
        data-testid="policies-skeleton"
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', px: 2, minHeight: 60 }}
      >
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton width="40%" height={20} />
      </Stack>
    );
  }
  if (publicPolicies.length === 0) return null;

  const expandIcon = policiesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />;

  return (
    <Box>
      <MenuRow
        icon={<DescriptionIcon />}
        label={t('mweb.common.policies')}
        onClick={() => setPoliciesOpen((v) => !v)}
        chevron={false}
        trailing={<Box sx={{ display: 'flex', color: 'text.secondary' }}>{expandIcon}</Box>}
      />
      <Collapse in={policiesOpen} timeout="auto" unmountOnExit>
        {publicPolicies.map((p) => (
          <Fragment key={p.id}>
            <Divider sx={{ ml: 8, mr: 2 }} />
            <ButtonBase
              onClick={() => navigate(`/policies/${p.slug}`, { replace: true })}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                minHeight: 48,
                pl: 8,
                pr: 2,
                textAlign: 'left',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ArticleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>
                {p.title}
              </Typography>
            </ButtonBase>
          </Fragment>
        ))}
      </Collapse>
    </Box>
  );
}
