import { Box, Typography } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { SmartLink } from '../SmartLink';

/** The operator's one-line strip above the header — free delivery, a sale, a notice. */
export function AnnouncementBar() {
  const { announcement_enabled: enabled, announcement_text: text, announcement_link: link } = useStoreSettings();
  if (!enabled || !text.trim()) return null;
  return (
    <Box sx={{ bgcolor: 'text.primary', color: 'background.paper', px: 2, py: 0.75, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {link ? (
          <SmartLink to={link} color="inherit" underline="always">
            {text}
          </SmartLink>
        ) : (
          text
        )}
      </Typography>
    </Box>
  );
}
