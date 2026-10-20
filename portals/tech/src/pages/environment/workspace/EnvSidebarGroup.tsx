import type { ReactNode } from 'react';
import { Collapse, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from '@duncit/app-settings';

export interface SidebarLink {
  value: string;
  label: string;
  subtitle: string;
  /** Failing keys; anything above zero is flagged in red. */
  failing?: number;
  /** True when every key in it has passed its latest test. */
  healthy?: boolean;
  icon?: ReactNode;
}

interface Props {
  id: string;
  title: string;
  subtitle: string;
  open: boolean;
  links: readonly SidebarLink[];
  selected: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

function StatusIcon({ link }: Readonly<{ link: SidebarLink }>) {
  const { t } = useTranslation();
  if (link.icon) return <>{link.icon}</>;
  if (link.failing) {
    return <ErrorIcon fontSize="small" color="error" titleAccess={t('tech.environment.failingCount', { vars: { count: link.failing } })} />;
  }
  if (link.healthy) return <CheckCircleIcon fontSize="small" color="success" titleAccess={t('tech.environment.historyPassed')} />;
  return <RadioButtonUncheckedIcon fontSize="small" color="disabled" aria-hidden />;
}

/** One foldable group: a title + subtitle header, then its sections. */
export default function EnvSidebarGroup({ id, title, subtitle, open, links, selected, onToggle, onSelect }: Readonly<Props>) {
  const listId = `env-group-${id}`;
  return (
    <li>
      <ListItemButton onClick={onToggle} aria-expanded={open} aria-controls={listId} sx={{ py: 0.5 }}>
        <ListItemText
          primary={title}
          secondary={subtitle}
          slotProps={{
            primary: { variant: 'overline', sx: { fontWeight: 800, lineHeight: 1.6 } },
            secondary: { variant: 'caption', noWrap: true },
          }}
        />
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List id={listId} dense disablePadding>
          {links.map((link) => (
            <li key={link.value}>
              <EnvSidebarLink link={link} selected={selected === link.value} onSelect={onSelect} inset />
            </li>
          ))}
        </List>
      </Collapse>
    </li>
  );
}

/** One section row: status icon, title, and its counts as the subtitle. */
export function EnvSidebarLink({
  link,
  selected,
  onSelect,
  inset = false,
}: Readonly<{ link: SidebarLink; selected: boolean; onSelect: (value: string) => void; inset?: boolean }>) {
  return (
    <ListItemButton
      selected={selected}
      aria-current={selected ? 'page' : undefined}
      onClick={() => onSelect(link.value)}
      sx={{ pl: inset ? 2.5 : 2 }}
      data-testid={`env-section-${link.value}`}
    >
      <ListItemIcon sx={{ minWidth: (theme) => theme.spacing(4) }}>
        <StatusIcon link={link} />
      </ListItemIcon>
      <ListItemText
        primary={link.label}
        secondary={link.subtitle}
        slotProps={{
          primary: { variant: 'body2', noWrap: true, sx: { fontWeight: 600 } },
          secondary: { variant: 'caption', noWrap: true },
        }}
      />
    </ListItemButton>
  );
}
