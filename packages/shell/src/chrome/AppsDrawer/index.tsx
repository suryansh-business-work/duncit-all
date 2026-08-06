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
import { FileManagerDialog } from '../../file-manager';
import { matchesTool, SHELL_TOOLS, type ShellTool } from './tools';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tools this portal adds to the platform's own. */
  extraTools?: ShellTool[];
  /** The signed-in user's roles, for tools that gate on them. */
  roles?: readonly string[] | null;
  /** Opens the docked chat panel — the layout owns it, not this drawer. */
  onOpenChat?: () => void;
}

/**
 * The apps drawer behind the header's nine dots.
 *
 * It holds tools rather than pages: things that open OVER the console you are
 * in, so reaching for the file manager mid-form does not cost you the form.
 * The sidebar stays the place for this portal's own pages.
 */
export function AppsDrawer({ open, onClose, extraTools, roles, onOpenChat }: Readonly<Props>) {
  const [search, setSearch] = useState('');
  const [openTool, setOpenTool] = useState<string | null>(null);

  const tools = useMemo(() => [...SHELL_TOOLS, ...(extraTools ?? [])], [extraTools]);
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
            Apps
          </Typography>
          <IconButton onClick={close} aria-label="Close apps">
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
            placeholder="Search apps"
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
              Nothing matches “{search}”.
            </Typography>
          )}
        </List>
      </Drawer>

      {openTool === 'file-manager' && (
        <FileManagerDialog open roles={roles} onClose={() => setOpenTool(null)} />
      )}


    </>
  );
}

export { SHELL_TOOLS, type ShellTool } from './tools';
