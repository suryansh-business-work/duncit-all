import { type ReactNode } from 'react';
import { Box } from '@mui/material';
import { tokens } from '@duncit/theme';
import { DuncitTabs, useTabParam } from '@duncit/tabs';

export interface UserDetailsTabItem {
  /** Stable slug — this is what the URL carries, so it must not follow the label. */
  value: string;
  label: string;
  content: ReactNode;
}

export default function UserDetailsTabs({ tabs }: Readonly<{ tabs: UserDetailsTabItem[] }>) {
  const strip = useTabParam({
    items: tabs.map(({ value, label }) => ({ value, label })),
    fallback: tabs[0]?.value ?? '',
  });
  const active = tabs.find((tab) => tab.value === strip.value);
  return (
    <Box sx={{ minWidth: 0 }}>
      <DuncitTabs
        {...strip}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          position: 'sticky',
          top: tokens.size.headerHeight,
          zIndex: 10,
          bgcolor: 'background.paper',
          minHeight: 40,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 40, px: 1.5, textTransform: 'none' },
        }}
      />
      <Box sx={{ pt: 2 }}>{active?.content}</Box>
    </Box>
  );
}
