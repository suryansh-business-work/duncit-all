import { Controller, type Control } from 'react-hook-form';
import { Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, FormLabel } from '@mui/material';
import type { AppBuildArtifactKind } from '../queries';
import type { CreateBuildValues } from './create-build.types';

interface ArtifactFieldProps {
  control: Control<CreateBuildValues>;
  kinds: AppBuildArtifactKind[];
  label: string;
}

/**
 * Adds or removes one kind from the selection. Rebuilt from the platform's own
 * order, so the primary artifact stays first however the boxes were ticked.
 */
function toggleKind(
  current: readonly AppBuildArtifactKind[],
  kind: AppBuildArtifactKind,
  checked: boolean,
  kinds: readonly AppBuildArtifactKind[]
): AppBuildArtifactKind[] {
  if (checked) return kinds.filter((k) => k === kind || current.includes(k));
  return current.filter((k) => k !== kind);
}

/**
 * Which files to produce. Android only — iOS can make exactly one thing, and a
 * choice with a single option is a question not worth asking.
 */
export default function ArtifactField({ control, kinds, label }: Readonly<ArtifactFieldProps>) {
  return (
    <Controller
      control={control}
      name="artifacts"
      render={({ field, fieldState }) => (
        <FormControl component="fieldset" error={!!fieldState.error}>
          <FormLabel component="legend" sx={{ fontSize: 14 }}>
            {label}
          </FormLabel>
          <FormGroup row>
            {kinds.map((kind) => (
              <FormControlLabel
                key={kind}
                control={
                  <Checkbox
                    checked={field.value.includes(kind)}
                    onChange={(e) =>
                      field.onChange(toggleKind(field.value, kind, e.target.checked, kinds))
                    }
                  />
                }
                label={kind}
              />
            ))}
          </FormGroup>
          {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
