import { type ReactElement, type ReactNode } from 'react';
import { Box, Card } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DuncitTabs, useTabParam } from '@duncit/tabs';

export interface LeadTab {
  /** Stable id for selection + a11y. */
  value: string;
  label: string;
  icon?: ReactElement;
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
export default function LeadTabs({ tabs, defaultValue, ...rest }: Readonly<Props>) {
  const strip = useTabParam({
    items: tabs.map((t) => ({
      value: t.value,
      label: t.label,
      icon: t.icon,
      iconPosition: 'start' as const,
      testId: `lead-tab-${t.value}`,
    })),
    fallback: defaultValue ?? tabs[0]?.value ?? '',
  });
  const active = tabs.find((t) => t.value === strip.value) ?? tabs[0];

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
          bgcolor: t.palette.background.paper,
        })}
      >
        <DuncitTabs
          {...strip}
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
        />
      </Card>

      {/* Render only the active panel — cheaper than mounting all of them, and
          tab transitions stay snappy because each panel mounts fresh on switch. */}
      <Box role="tabpanel" data-testid={`lead-tabpanel-${active?.value ?? ''}`}>
        {active?.render()}
      </Box>
    </Box>
  );
}
