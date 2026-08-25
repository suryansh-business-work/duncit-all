import { Alert, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import type { CampaignVariable } from '../queries';

interface Props {
  variables: CampaignVariable[];
  /** Placeholders written in the draft that the renderer does not know. */
  unknown: string[];
}

const placeholder = (name: string) => `{{${name}}}`;

/** What you are allowed to write in the subject and the MJML. The samples come
 * from the renderer itself, so this list cannot drift from what substitutes. */
export default function CampaignVariables({ variables, unknown }: Readonly<Props>) {
  return (
    <Box>
      <Typography
        variant="caption"
        component="div"
        sx={{
          color: "text.secondary",
          mb: 0.75
        }}>
        Available variables — use them in the subject or the MJML
      </Typography>
      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          gap: 0.75
        }}>
        {variables.map((variable) => (
          <Tooltip
            key={variable.name}
            title={`${variable.description} Renders as: ${variable.sample}`}
          >
            <Chip
              size="small"
              variant="outlined"
              label={placeholder(variable.name)}
              sx={{ fontFamily: 'monospace' }}
            />
          </Tooltip>
        ))}
      </Stack>
      {unknown.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }} data-testid="unknown-variables">
          {`${unknown.map(placeholder).join(', ')} — not a known variable, so it renders as nothing.`}
        </Alert>
      )}
    </Box>
  );
}
