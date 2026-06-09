import { useNavigate } from 'react-router-dom';
import {
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface PoliciesSectionProps {
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
  onClose: () => void;
}

export default function PoliciesSection({
  publicPolicies,
  policiesOpen,
  setPoliciesOpen,
  onClose,
}: Readonly<PoliciesSectionProps>) {
  const navigate = useNavigate();
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
            primary="Policies"
            primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
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
                onClick={() => {
                  onClose();
                  navigate(`/policies/${p.slug}`);
                }}
                sx={{ pl: 6, pr: 2.5, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ArticleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={p.title}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </List>
  );
}
