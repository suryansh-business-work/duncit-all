import { Box, Typography } from '@mui/material';

const CELL_SX = { border: 1, borderColor: 'divider', px: 1.25, py: 0.75, verticalAlign: 'top' };

/**
 * Strings print as themselves; anything else prints as the JSON it is.
 *
 * `JSON.stringify` answers `undefined` for a function or a symbol, and the old
 * fallback was `String(value)` — which prints `[object Object]` for anything
 * with a default `toString` and tells a reader nothing (S6551). A demo that
 * returns a function is a demo naming what it returns, so say that instead.
 */
function show(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
  return JSON.stringify(value, null, 2) ?? '[not serialisable]';
}

interface Props {
  /** Named results of running the package's real exports over the mock. */
  output: Record<string, unknown>;
}

/**
 * What the package ACTUALLY returned for the mock above.
 *
 * This is the live view for the framework-free packages: they have no UI, so
 * "run the real export and show what came back" is the only honest way to
 * demonstrate one — and because the mock is editable, a reader can push it to
 * the edge case they came to check.
 */
export default function DemoOutput({ output }: Readonly<Props>) {
  const rows = Object.entries(output);
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        This demo returned nothing for the current mock.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <Box component="tbody">
          {rows.map(([key, value]) => (
            <Box component="tr" key={key}>
              <Box
                component="th"
                scope="row"
                sx={{ ...CELL_SX, bgcolor: 'action.hover', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}
              >
                {key}
              </Box>
              <Box
                component="td"
                sx={{ ...CELL_SX, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
              >
                {show(value)}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
