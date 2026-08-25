import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { defineDemo, defineDemos } from '../types';

interface SelfMock {
  /** What a demo module declares, in the words the type uses. */
  fields: { field: string; required: boolean; what: string }[];
}

export default defineDemos('docs-demos', [
  defineDemo<SelfMock>({
    id: 'shape',
    title: 'A demo, demonstrating what a demo is',
    note:
      'The panel above is the live view, this table is the mock rendered back, and the file under both is the source. Every package on this page is shown through exactly these three.',
    mock: {
      fields: [
        { field: 'id', required: true, what: 'Stable within the package — the portal keys on it.' },
        { field: 'title', required: true, what: 'What this example demonstrates.' },
        { field: 'note', required: false, what: 'One line telling the reader what to look at.' },
        { field: 'mock', required: true, what: 'Realistic duncit data. Editable on the page.' },
        { field: 'render', required: false, what: 'Mounts the real component with the mock.' },
        { field: 'compute', required: false, what: 'Runs the real exports over the mock.' },
      ],
    },
    render: (mock) => (
      <Stack spacing={1.5}>
        <Alert severity="info" variant="outlined">
          Edit the JSON below — add a field, change a description — and this list answers for
          it immediately. That is the whole contract every demo on this page holds.
        </Alert>
        {mock.fields.map((entry) => (
          <Stack key={entry.field} direction="row" spacing={1.5} sx={{
            alignItems: "flex-start"
          }}>
            <Box sx={{ minWidth: 96 }}>
              <Chip
                size="small"
                label={entry.field}
                color={entry.required ? 'primary' : 'default'}
                variant={entry.required ? 'filled' : 'outlined'}
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            </Box>
            <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>
              {entry.what}
            </Typography>
          </Stack>
        ))}
      </Stack>
    ),
    compute: (mock) => ({
      'Required fields': mock.fields.filter((entry) => entry.required).map((e) => e.field),
      'Optional fields': mock.fields.filter((entry) => !entry.required).map((e) => e.field),
      'A demo with neither render nor compute':
        'still shows its mock and its source — no package opens to a blank panel.',
    }),
  }),
]);
