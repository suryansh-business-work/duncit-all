import { Stack, Typography } from '@mui/material';
import type { WaterfallLine } from './waterfall-lines';

function WaterfallRow({ symbol, line }: Readonly<{ symbol: string; line: WaterfallLine }>) {
  return (
    <Stack spacing={0}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography variant="body2" sx={{ fontWeight: line.strong ? 900 : 600 }}>
          {line.label}
        </Typography>
        <Typography
          variant="body2"
          color={line.strong ? 'primary.main' : 'text.primary'}
          sx={{ fontWeight: line.strong ? 900 : 700 }}
        >
          {symbol}
          {line.value.toFixed(2)}
        </Typography>
      </Stack>
      {line.secondary && (
        <Typography variant="caption" color="text.secondary">
          {line.secondary}
        </Typography>
      )}
    </Stack>
  );
}

/** Simple label/amount list for the pod finance waterfall. */
export default function FinanceWaterfallList({
  symbol,
  lines,
}: Readonly<{ symbol: string; lines: WaterfallLine[] }>) {
  return (
    <Stack spacing={0.75}>
      {lines.map((line) => (
        <WaterfallRow key={line.key} symbol={symbol} line={line} />
      ))}
    </Stack>
  );
}
