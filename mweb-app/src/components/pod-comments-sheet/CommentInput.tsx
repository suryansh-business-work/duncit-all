import { IconButton, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { Form, Formik } from 'formik';
import { commentSchema } from './helpers';

interface Props {
  viewerId?: string | null;
  posting: boolean;
  onSubmit: (values: { text: string }, helpers: any) => Promise<void> | void;
}

export default function CommentInput({ viewerId, posting, onSubmit }: Readonly<Props>) {
  return (
    <Formik initialValues={{ text: '' }} validationSchema={commentSchema} onSubmit={onSubmit}>
      {({ values, handleChange, errors, touched }) => (
        <Form>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              p: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              pb: 'calc(env(safe-area-inset-bottom) + 12px)',
            }}
          >
            <TextField
              name="text"
              value={values.text}
              onChange={handleChange}
              fullWidth
              size="small"
              placeholder={viewerId ? 'Add a comment…' : 'Sign in to comment'}
              disabled={!viewerId}
              error={touched.text && !!errors.text}
              helperText={touched.text && errors.text}
            />
            <IconButton
              color="primary"
              type="submit"
              disabled={!viewerId || posting || !values.text.trim()}
            >
              <SendIcon />
            </IconButton>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
