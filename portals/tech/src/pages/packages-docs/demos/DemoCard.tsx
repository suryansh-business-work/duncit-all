import { useMemo, useState } from 'react';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import type { PackageDemo } from '@duncit/docs-demos';
import DemoBoundary from './DemoBoundary';
import DemoOutput from './DemoOutput';
import MockDataEditor from './MockDataEditor';

/** Runs `compute` defensively — a thrown export belongs in the card, not the page. */
function runCompute(demo: PackageDemo, mock: unknown): Record<string, unknown> {
  if (!demo.compute) return {};
  try {
    return demo.compute(mock);
  } catch (e) {
    return { Error: e instanceof Error ? e.message : String(e) };
  }
}

function SectionLabel({ children }: Readonly<{ children: string }>) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
      {children}
    </Typography>
  );
}

/**
 * One demo: the view, and the data that produced it.
 *
 * The mock is state here rather than in the demo module, because the whole
 * point is that a reader can change it — the module ships the starting value
 * and this card owns whatever the reader has made of it since.
 */
export default function DemoCard({ demo }: Readonly<{ demo: PackageDemo }>) {
  const [mock, setMock] = useState<unknown>(demo.mock);
  const output = useMemo(() => runCompute(demo, mock), [demo, mock]);
  // A changed mock must re-mount the boundary, so a demo that threw on bad data
  // gets a fresh chance the moment the data is fixed.
  const resetKey = JSON.stringify(mock) ?? '';

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {demo.title}
          </Typography>
          {demo.note && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
              {demo.note}
            </Typography>
          )}
        </Box>

        {demo.render && (
          <Box>
            <SectionLabel>Live view</SectionLabel>
            <Box sx={{ mt: 1, p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <DemoBoundary resetKey={resetKey}>{demo.render(mock)}</DemoBoundary>
            </Box>
          </Box>
        )}

        {demo.compute && (
          <Box>
            <SectionLabel>What the package returned</SectionLabel>
            <Box sx={{ mt: 1 }}>
              <DemoOutput output={output} />
            </Box>
          </Box>
        )}

        <Divider />

        <Box>
          <SectionLabel>Mock data</SectionLabel>
          <Box sx={{ mt: 1 }}>
            <MockDataEditor initial={demo.mock} onChange={setMock} />
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
