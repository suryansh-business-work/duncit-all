import { useNavigate } from 'react-router-dom';
import {
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '../../../i18n/useTranslation';

interface PoliciesSectionProps {
  publicPolicies: { id: string; slug: string; title: string }[];
  /** The links are still in flight — hold the row rather than popping it in. */
  loading?: boolean;
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
}

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
        sx={{ alignItems: 'center', px: 2.5, py: 2.25 }}
      >
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton width="40%" height={20} />
      </Stack>
    );
  }
  if (publicPolicies.length === 0) return null;

  return (
    <List sx={{ py: 1 }}>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => setPoliciesOpen((v) => !v)}
          sx={{ px: 2.5, py: 1.25 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={t('mweb.common.policies')}
            slotProps={{
              primary: { sx: { fontSize: 14, fontWeight: 500 } }
            }}
          />
          {policiesOpen ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </ListItemButton>
      </ListItem>
      <Collapse in={policiesOpen} timeout="auto" unmountOnExit>
        <List disablePadding>
          {publicPolicies.map((p) => (
            <ListItem key={p.id} disablePadding>
              <ListItemButton
                onClick={() => navigate(`/policies/${p.slug}`, { replace: true })}
                sx={{ pl: 6, pr: 2.5, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ArticleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={p.title}
                  slotProps={{
                    primary: { sx: { fontSize: 13, fontWeight: 500 } }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </List>
  );
}
