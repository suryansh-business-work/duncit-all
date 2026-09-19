import { Box, Typography } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { SmartLink } from '../SmartLink';

/**
 * The operator's one-line strip above the header — free delivery, a sale, a
 * notice. While an occasion is on, its own line takes the strip regardless of
 * the announcement switch; being a notice rather than a promotion, it carries
 * no link.
 */
export function AnnouncementBar() {
  const { announcement_enabled: enabled, announcement_text: text, announcement_link: link, active_occasion: occasion } = useStoreSettings();
  const occasionText = occasion?.announcement_text.trim() ?? '';
  const regularText = enabled ? text.trim() : '';
  const shown = occasionText || regularText;
  if (!shown) return null;
  const to = occasionText ? '' : link;
  return (
    <Box sx={{ bgcolor: 'text.primary', color: 'background.paper', px: 2, py: 0.75, textAlign: 'center' }} data-testid="announcement-bar">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {to ? (
          <SmartLink to={to} color="inherit" underline="always">
            {shown}
          </SmartLink>
        ) : (
          shown
        )}
      </Typography>
    </Box>
  );
}
