import {
  Box,
  Button,
  IconButton,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MediaPickerField from '../MediaPickerField';
import { DOC_TYPES, type DocEntry } from './queries';
import { getVenueError, type VenueValidationErrors } from './venue.form';

interface Props {
  docs: DocEntry[];
  setDocs: (next: DocEntry[]) => void;
  s2: { gstin: string; pan: string };
  setS2: (next: { gstin: string; pan: string }) => void;
  errors?: VenueValidationErrors;
}

export default function VenueDocsSection({ docs, setDocs, s2, setS2, errors }: Props) {
  const err = (path: string) => getVenueError(errors, path);
  return (
    <>
      <Typography variant="subtitle2">Documents</Typography>
      <Stack spacing={0.75}>
        {err('step2.documents') && <FormHelperText error>{err('step2.documents')}</FormHelperText>}
        {docs.map((d, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              label="Type"
              value={d.type}
              error={!!err(`step2.documents[${i}].type`)}
              helperText={err(`step2.documents[${i}].type`) || undefined}
              sx={{ minWidth: 180 }}
              onChange={(e) =>
                setDocs(docs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))
              }
            >
              {DOC_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ flex: 1 }}>
              <MediaPickerField
                label="File"
                value={d.url}
                onChange={(url) =>
                  setDocs(docs.map((x, j) => (j === i ? { ...x, url } : x)))
                }
                helperText={err(`step2.documents[${i}].url`) || undefined}
                folder="/venues/docs"
              />
            </Box>
            <IconButton onClick={() => setDocs(docs.filter((_, j) => j !== i))}>
              <DeleteIcon />
            </IconButton>
          </Stack>
        ))}
        <Button onClick={() => setDocs([...docs, { type: 'GST Certificate', url: '' }])}>
          Add document
        </Button>
      </Stack>
      <Box sx={{ display: 'grid', columnGap: 1.5, rowGap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField
          label="GSTIN"
          size="small"
          value={s2.gstin}
          error={!!err('step2.gstin')}
          helperText={err('step2.gstin') || undefined}
          onChange={(e) => setS2({ ...s2, gstin: e.target.value })}
        />
        <TextField
          label="PAN"
          size="small"
          value={s2.pan}
          error={!!err('step2.pan')}
          helperText={err('step2.pan') || undefined}
          onChange={(e) => setS2({ ...s2, pan: e.target.value })}
        />
      </Box>
    </>
  );
}
