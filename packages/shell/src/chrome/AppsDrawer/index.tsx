import { useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../../i18n/useTranslation';
import { FileManagerDialog } from '../../file-manager';
import { JumpToPortalDialog } from '../jump-to-portal';
import { AskBotDialog } from '../ask-bot';
import { matchesTool, useShellTools, type ShellTool } from './tools';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tools this portal adds to the platform's own. */
  extraTools?: ShellTool[];
  /** The signed-in user's roles, for tools that gate on them. */
  roles?: readonly string[] | null;
  /** Opens the docked chat panel — the layout owns it, not this drawer. */
  onOpenChat?: () => void;
  /** Off drops the staff-chat entry, so the drawer never offers what the
   * header has been told this console does not have (Admin setting). */
  chatEnabled?: boolean;
}

/**
 * The apps drawer behind the header's nine dots.
 *
 * It holds tools rather than pages: things that open OVER the console you are
 * in, so reaching for the file manager mid-form does not cost you the form.
 * The sidebar stays the place for this portal's own pages.
 */
export function AppsDrawer({
  open,
  onClose,
  extraTools,
  roles,
  onOpenChat,
  chatEnabled = true,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [openTool, setOpenTool] = useState<string | null>(null);
  const shellTools = useShellTools();

  const tools = useMemo(() => {
    const platform = chatEnabled
      ? shellTools
      : shellTools.filter((tool) => tool.key !== 'staff-chat');
    return [...platform, ...(extraTools ?? [])];
  }, [extraTools, chatEnabled, shellTools]);
  const shown = useMemo(() => tools.filter((tool) => matchesTool(tool, search)), [tools, search]);

  const close = () => {
    setSearch('');
    onClose();
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={close}
        PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {t('shell.appsDrawer.title')}
          </Typography>
          <IconButton onClick={close} aria-label={t('shell.appsDrawer.close')}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('shell.appsDrawer.search')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List sx={{ overflowY: 'auto' }}>
          {shown.map((tool) => (
            <ListItemButton
              key={tool.key}
              onClick={() => {
                // Chat is docked into the layout rather than opened here, so
                // that one is handed up; everything else opens over the page.
                if (tool.key === 'staff-chat') onOpenChat?.();
                else setOpenTool(tool.key);
                close();
              }}
            >
              <ListItemIcon>{tool.icon}</ListItemIcon>
              <ListItemText primary={tool.name} secondary={tool.description} />
            </ListItemButton>
          ))}
          {shown.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
              {t('shell.appsDrawer.noMatch', { vars: { term: search } })}
            </Typography>
          )}
        </List>
      </Drawer>

      {openTool === 'file-manager' && (
        <FileManagerDialog open roles={roles} onClose={() => setOpenTool(null)} />
      )}

      {openTool === 'jump-to-portal' && (
        <JumpToPortalDialog open onClose={() => setOpenTool(null)} />
      )}

      {openTool === 'ask-bot' && <AskBotDialog open onClose={() => setOpenTool(null)} />}
    </>
  );
}

export { useShellTools, type ShellTool } from './tools';
