import Editor from '@monaco-editor/react';
import {
  AppBar,
  Box,
  Dialog,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (next: string) => void;
  language: string;
  title: string;
}

/**
 * The same snippet, full screen.
 *
 * It shares its value with the inline block rather than copying it, so a reader
 * who expands a block mid-edit keeps what they typed, and what they type here
 * is still there when they close it.
 */
export default function CodeExpandDialog({
  open,
  onClose,
  value,
  onChange,
  language,
  title,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar variant="dense">
          <Typography variant="subtitle2" sx={{ flex: 1, fontFamily: 'monospace' }}>
            {title}
          </Typography>
          <IconButton edge="end" onClick={onClose} aria-label={t('tech.packagesDocs.closeEditor')}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {open && (
          <Editor
            height="100%"
            language={language}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
            value={value}
            onChange={(next) => onChange(next ?? '')}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              automaticLayout: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
            }}
          />
        )}
      </Box>
    </Dialog>
  );
}
