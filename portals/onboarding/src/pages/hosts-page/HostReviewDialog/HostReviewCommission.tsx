import { useRef, useState, type KeyboardEvent } from 'react';
import { InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';

interface Props {
  /** The host's stored override. 0 means "no override — inherit the default". */
  value: number;
  /** Finance → Default Deductions, the % settlement applies without an override. */
  defaultPct: number;
  saving: boolean;
  /** Resolves true once persisted, false when the save failed. Never rejects —
   * the container turns every error into an inline alert plus a toast. */
  onSave: (pct: number) => Promise<boolean>;
}

const isValidPct = (text: string) => {
  const n = Number(text);
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
};

/**
 * Duncit's commission on this host's payouts, seeded from the finance default
 * and saved on blur.
 *
 * There is no Save button by design: the field starts at the global default, so
 * an untouched field must NOT write anything — writing the default as a
 * per-host override would silently pin this host to today's number and cut them
 * out of any future change in Finance → Default Deductions. Hence the blur only
 * fires when the text actually differs from what is persisted.
 *
 * Seeded once at mount; the parent keys this component per host, so switching
 * hosts remounts it. That is what stops a saved 0 from snapping back to the
 * default the instant the parent merges the new value.
 */
export default function HostReviewCommission({ value, defaultPct, saving, onSave }: Readonly<Props>) {
  const [text, setText] = useState(() => String(value > 0 ? value : defaultPct));
  const savedRef = useRef(text);
  const valid = isValidPct(text);

  const commit = () => {
    if (!valid || text === savedRef.current) return;
    const attempted = text;
    // onSave never rejects — the container turns every failure into `false`
    // plus an inline alert, so there is nothing to catch here. On failure
    // savedRef is left alone, which is what makes the next blur retry.
    onSave(Number(attempted)).then((ok) => {
      if (ok) savedRef.current = attempted;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') commit();
  };

  const helperText = valid
    ? `Finance default is ${defaultPct}%. Set 0 to always follow it.`
    : 'Enter a number between 0 and 100.';

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="review-host-commission">
      <Typography variant="subtitle2" fontWeight={800}>
        Host commission
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        The commission Duncit takes from this host&apos;s payouts. Defaults to the{' '}
        {defaultPct}% set in Finance → Default Deductions; override it here and it saves when you
        leave the field.
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
        <TextField
          label="Commission from host"
          type="number"
          size="small"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          disabled={saving}
          error={!valid}
          helperText={helperText}
          inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Host commission percentage' }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          sx={{ maxWidth: 260 }}
        />
        {saving && (
          <Typography variant="caption" color="text.secondary" data-testid="commission-saving">
            Saving…
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
