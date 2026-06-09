import { useState, type ReactNode } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { HEADER_HEIGHT } from '../../admin-layout/styled';

export interface UserDetailsTabItem {
  label: string;
  content: ReactNode;
}

export default function UserDetailsTabs({ tabs }: Readonly<{ tabs: UserDetailsTabItem[] }>) {
  const [value, setValue] = useState(0);
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
          top: HEADER_HEIGHT,
          zIndex: 10,
          bgcolor: 'background.paper',
          minHeight: 40,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 40, px: 1.5, textTransform: 'none' },
        }}
      >
        {tabs.map((tab) => <Tab key={tab.label} label={tab.label} />)}
      </Tabs>
      <Box sx={{ pt: 2 }}>{tabs[value]?.content}</Box>
    </Box>
  );
}