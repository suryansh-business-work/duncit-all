import { type ReactNode } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { tokens } from '@duncit/theme';
import { useTabParam } from '@duncit/ui';

export interface UserDetailsTabItem {
  /** Stable slug — this is what the URL carries, so it must not follow the label. */
  value: string;
  label: string;
  content: ReactNode;
}

export default function UserDetailsTabs({ tabs }: Readonly<{ tabs: UserDetailsTabItem[] }>) {
  const [value, setValue] = useTabParam({
    values: tabs.map((tab) => tab.value),
    fallback: tabs[0]?.value ?? '',
  });
  const active = tabs.find((tab) => tab.value === value);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Tabs
        value={value}
        onChange={(_, nextValue) => setValue(nextValue)}
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
      >
        {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} />)}
      </Tabs>
      <Box sx={{ pt: 2 }}>{active?.content}</Box>
    </Box>
  );
}
