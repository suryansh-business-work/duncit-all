import { MenuItem, TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';

/** MUI yields a `string[]` from the multi-select and a `string` from the single one. */
const toHostIds = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value]);

/**
 * Static-list host picker, rendered when no `searchHosts` is injected. With
 * `config.singleHost` it is one dropdown holding exactly one id (Admin, whose
 * options are the approved hosts); without it, the multi-select Club Admin
 * assigns several hosts through.
 */
export default function HostSelectField() {
  const { config, users } = usePodFormData();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const hosts = useWatch({ control, name: 'pod_hosts_id' });

  const userName = (id: string) => {
    const user = users.find((u) => u.user_id === id);
    return user?.full_name || user?.email || id.slice(0, 6);
  };

  const single = !!config.singleHost;
  const [firstHost = ''] = hosts;
  const label = single ? 'Host' : 'Hosts';
  const value = single ? firstHost : hosts;
  // Both branches label through `userName`, so a host who is no longer in the
  // options (approval revoked) still shows an id stub instead of a blank field.
  const selectProps = single
    ? { renderValue: (sel: unknown) => userName(sel as string) }
    : { multiple: true, renderValue: (sel: unknown) => (sel as string[]).map(userName).join(', ') };

  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(event) => {
        const next = toHostIds(event.target.value);
        setValue('pod_hosts_id', next, { shouldValidate: true });
      }}
      SelectProps={selectProps}
      fullWidth
      required
      error={!!errors.pod_hosts_id}
      helperText={errors.pod_hosts_id?.message}
    >
      {users.map((u) => (
        <MenuItem key={u.user_id} value={u.user_id}>
          {u.full_name || u.email}
        </MenuItem>
      ))}
    </TextField>
  );
}
