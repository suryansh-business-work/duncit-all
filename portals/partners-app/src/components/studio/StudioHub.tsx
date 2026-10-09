import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';

export interface StudioHubTab {
  /** The tab's own route — the same one its sidebar entry opens. */
  to: string;
  label: string;
  /** Rendered only while its tab is open — a hidden tab fetches nothing. */
  render: () => ReactNode;
}

interface Props {
  /** Prefix for the tab / panel ids (and the test ids). */
  id: string;
  /** Names the strip for screen readers. */
  label: string;
  tabs: readonly StudioHubTab[];
}

/**
 * The pages one studio sidebar group holds (Pods → Your Pods / Auto Pods,
 * Requests → Pod / Change Requests, …), drawn as ONE page with a tab strip.
 *
 * Every tab keeps its own route, and the selection is read from it: the
 * sidebar entry and the tab are the same link, so the menu highlights the
 * right option, an old bookmark still opens its page, and nothing had to be
 * removed to be grouped. A tab click navigates (replacing history — a tab is a
 * view of the page, not a destination, the same rule as useTabParam).
 */
export default function StudioHub({ id, label, tabs }: Readonly<Props>) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const items = useMemo(
    () => tabs.map((tab) => ({ value: tab.to, label: tab.label, testId: `${id}-tab-${tab.to}` })),
    [tabs, id],
  );
  const current = tabs.find((tab) => tab.to === pathname) ?? tabs[0];
  if (!current) return null;
  const single = tabs.length === 1;
  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid={id}>
      {!single && (
        <DuncitTabs
          items={items}
          value={current.to}
          onChange={(to) => navigate(to, { replace: true })}
          idPrefix={id}
          aria-label={label}
          searchable={false}
        />
      )}
      <Box {...(single ? {} : tabPanelProps(id, current.to))}>{current.render()}</Box>
    </Stack>
  );
}
