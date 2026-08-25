import { Box, Typography } from '@mui/material';

interface Props {
  /** The `vars` column: a JSON object, or empty for a raw-HTML send. */
  json?: string | null;
}

/** `{"name":"Asha"}` → rows. Anything unparseable is shown as it was stored. */
function parse(json?: string | null): { entries: [string, string][]; raw: string } {
  const raw = (json ?? '').trim();
  if (!raw) return { entries: [], raw: '' };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { entries: [], raw };
    return {
      entries: Object.entries(parsed).map(([k, v]) => [k, String(v)]),
      raw: JSON.stringify(parsed, null, 2),
    };
  } catch {
    return { entries: [], raw };
  }
}

/**
 * What the template was filled in with.
 *
 * The send's own variables — the logo, the localized copy — are not stored:
 * they are identical on every row and would bury the two or three values
 * someone opens this row to check.
 */
export default function EmailLogVars({ json }: Readonly<Props>) {
  const { entries, raw } = parse(json);

  if (!raw) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          No variables — this email was sent as ready-made HTML.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {entries.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, max-content) 1fr',
            columnGap: 2,
            rowGap: 1,
            mb: 2,
          }}
        >
          {entries.map(([key, value]) => (
            <Box key={key} sx={{ display: 'contents' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {`{{${key}}}`}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {value || <em>empty</em>}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block",
          mb: 0.5
        }}>
        As stored
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontSize: 12,
          overflowX: 'auto',
        }}
      >
        {raw}
      </Box>
    </Box>
  );
}
