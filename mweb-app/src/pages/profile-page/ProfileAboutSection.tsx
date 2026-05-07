import { useState } from 'react';
import { Form, Formik } from 'formik';
import { useMutation } from '@apollo/client';
import * as yup from 'yup';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { UPDATE_MY_PROFILE } from './queries';

const profileSchema = yup.object({
  bio: yup.string().max(500, 'Description must be 500 characters or fewer').optional(),
  profile_links: yup
    .array()
    .of(
      yup.object({
        label: yup.string().trim().max(40).required('Label is required'),
        url: yup.string().trim().url('Enter a valid URL').required('URL is required'),
      })
    )
    .max(5, 'Add up to 5 links')
    .required(),
});

export default function ProfileAboutSection({ me, onSaved }: { me: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updateProfile, { loading, error }] = useMutation(UPDATE_MY_PROFILE);
  const links = me.profile_links ?? [];

  if (!editing) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" color="text.secondary">
            Description and links
          </Typography>
          <Button size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Stack>
        {me.bio ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {me.bio}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Add a short description so members know more about you.
          </Typography>
        )}
        {links.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {links.map((link: any) => (
              <Link key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </Link>
            ))}
          </Stack>
        )}
        {saved && <Alert severity="success" onClose={() => setSaved(false)}>Profile saved</Alert>}
      </Stack>
    );
  }

  return (
    <Formik
      initialValues={{ bio: me.bio ?? '', profile_links: links.length ? links : [{ label: '', url: '' }] }}
      validationSchema={profileSchema}
      onSubmit={async (values) => {
        const profile_links = values.profile_links.filter((link: any) => link.label || link.url);
        await updateProfile({ variables: { input: { bio: values.bio || '', profile_links } } });
        setEditing(false);
        setSaved(true);
        onSaved();
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
        <Form>
          <Stack spacing={2}>
            <TextField
              fullWidth
              name="bio"
              label="Profile description"
              value={values.bio}
              onChange={handleChange}
              onBlur={handleBlur}
              multiline
              minRows={3}
              error={touched.bio && !!errors.bio}
              helperText={touched.bio && (errors.bio as string)}
            />
            <Stack spacing={1}>
              <Typography variant="subtitle2">Links</Typography>
              {values.profile_links.map((link: any, index: number) => {
                const itemErrors = (errors.profile_links as any)?.[index] ?? {};
                const itemTouched = (touched.profile_links as any)?.[index] ?? {};
                return (
                  <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      name={`profile_links.${index}.label`}
                      label="Label"
                      value={link.label}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={itemTouched.label && !!itemErrors.label}
                      helperText={itemTouched.label && itemErrors.label}
                    />
                    <TextField
                      fullWidth
                      name={`profile_links.${index}.url`}
                      label="URL"
                      value={link.url}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={itemTouched.url && !!itemErrors.url}
                      helperText={itemTouched.url && itemErrors.url}
                    />
                    <IconButton
                      aria-label="remove link"
                      onClick={() => setFieldValue('profile_links', values.profile_links.filter((_item: any, i: number) => i !== index))}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                );
              })}
              <Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={values.profile_links.length >= 5}
                  onClick={() => setFieldValue('profile_links', [...values.profile_links, { label: '', url: '' }])}
                >
                  Add link
                </Button>
              </Box>
            </Stack>
            {error && <Alert severity="error">{error.message}</Alert>}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setEditing(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </Stack>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
