import { useState, type ReactNode } from 'react';
import { Box, Card, Tab, Tabs } from '@mui/material';
import { alpha } from '@mui/material/styles';

export interface LeadTab {
  /** Stable id for selection + a11y. */
  value: string;
  label: string;
  icon?: ReactNode;
  render: () => ReactNode;
}

interface Props {
  tabs: LeadTab[];
  /** Initial active tab value. Defaults to the first tab. */
  defaultValue?: string;
  /** Optional test id surfaced on the wrapping container. */
  'data-testid'?: string;
}

/**
 * Lead-detail tab strip. Light theme gets a flat white background with a
 * single divider underneath (no heavy shadow). The active panel sits inside
 * a thin-bordered Card so the whole strip feels like one piece.
 */
export default function LeadTabs({ tabs, defaultValue, ...rest }: Props) {
  const [value, setValue] = useState(defaultValue ?? tabs[0]?.value);
  const active = tabs.find((t) => t.value === value) ?? tabs[0];

  return (
    <Box data-testid={rest['data-testid']}>
      <Card
        variant="outlined"
        sx={(t) => ({
          mb: 2,
          borderColor: t.palette.divider,
          borderRadius: 1.5,
          // Flat in light, subtle in dark — keeps the strip from competing
          // with the hero card above.
          boxShadow: 'none',
          bgcolor: t.palette.mode === 'light' ? '#fff' : t.palette.background.paper,
        })}
      >
        <Tabs
          value={value}
          onChange={(_, v) => setValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={(t) => ({
            minHeight: 48,
            px: 1,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              color: t.palette.text.secondary,
              '&.Mui-selected': { color: t.palette.primary.main },
              '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.04) },
            },
            '& .MuiTabs-indicator': { height: 3, borderRadius: 1 },
          })}
        >
          {tabs.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              label={t.label}
              icon={t.icon as any}
              iconPosition="start"
              data-testid={`lead-tab-${t.value}`}
            />
          ))}
        </Tabs>
      </Card>

      {/* Render only the active panel — cheaper than mounting all of them, and
          tab transitions stay snappy because each panel mounts fresh on switch. */}
      <Box role="tabpanel" data-testid={`lead-tabpanel-${active?.value ?? ''}`}>
        {active?.render()}
      </Box>
    </Box>
  );
}
