import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import AuthModeToggle from '../AuthModeToggle';

interface SurveyHeaderActionsProps {
  onLogout: () => void;
}

export default function SurveyHeaderActions({ onLogout }: Readonly<SurveyHeaderActionsProps>) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <AuthModeToggle placement="inline" />
      <Tooltip title="Logout">
        <IconButton
          size="small"
          onClick={onLogout}
          aria-label="Logout"
          sx={{
            minWidth: 40,
            minHeight: 40,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
          }}
        >
          <Box component="i" className="fa-solid fa-right-from-bracket" sx={{ fontSize: 16, lineHeight: 1 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}