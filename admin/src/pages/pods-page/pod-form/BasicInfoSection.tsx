import { useFormikContext } from 'formik';
import { MenuItem, Stack, TextField } from '@mui/material';
import type { PodForm } from '../queries';

interface Props {
  users: any[];
  userName: (id: string) => string;
}

export default function BasicInfoSection({ users, userName }: Props) {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PodForm>();
  const err = (k: keyof PodForm) => !!touched[k] && !!errors[k];
  const help = (k: keyof PodForm) => (touched[k] ? (errors[k] as string) : undefined);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Pod title"
          name="pod_title"
          value={values.pod_title}
          onChange={handleChange}
          fullWidth
          required
          error={err('pod_title')}
          helperText={help('pod_title')}
        />
        <TextField
          label="Pod ID"
          name="pod_id"
          value={values.pod_id}
          onChange={handleChange}
          disabled={!!values.id}
          helperText={values.id ? 'Locked' : 'Auto if blank'}
          fullWidth
        />
      </Stack>
      <TextField
        select
        label="Hosts"
        value={values.pod_hosts_id}
        onChange={(e) => {
          const v = e.target.value as unknown as string[] | string;
          setFieldValue('pod_hosts_id', typeof v === 'string' ? v.split(',') : v);
        }}
        SelectProps={{
          multiple: true,
          renderValue: (sel: any) => (sel as string[]).map(userName).join(', '),
        }}
        fullWidth
        required
        error={err('pod_hosts_id')}
        helperText={help('pod_hosts_id')}
      >
        {users.map((u) => (
          <MenuItem key={u.user_id} value={u.user_id}>
            {u.full_name || u.email}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Hashtags (space or comma separated)"
        name="pod_hashtag_text"
        value={values.pod_hashtag_text}
        onChange={handleChange}
        fullWidth
        placeholder="#cricket #weekend"
      />
    </Stack>
  );
}
