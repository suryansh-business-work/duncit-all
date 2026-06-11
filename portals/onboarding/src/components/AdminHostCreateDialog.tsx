import { useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { Form, Formik } from 'formik';
import HostAccordionForm from './host-form/HostAccordionForm';
import {
  hostCreateInitialValues,
  hostCreateSchema,
  toHostCreateVariables,
  type HostCreateValues,
} from '../forms/host.form';

const USERS = gql`
  query UsersForHostCreate {
    users {
      user_id
      full_name
      email
      phone_number
    }
  }
`;

const ADMIN_CREATE_HOST = gql`
  mutation AdminCreateHost(
    $target_user_id: ID!
    $step1: HostStep1Input!
    $step2: HostStep2Input!
    $step3: HostStep3Input!
    $submit: Boolean
  ) {
    adminCreateHost(
      target_user_id: $target_user_id
      step1: $step1
      step2: $step2
      step3: $step3
      submit: $submit
    ) {
      id
      status
    }
  }
`;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminHostCreateDialog({ open, onClose, onSaved }: Readonly<Props>) {
  const { data: usersData } = useQuery(USERS, { skip: !open });
  const [error, setError] = useState('');
  const submitForReviewRef = useRef(false);
  const [submitHost, { loading }] = useMutation(ADMIN_CREATE_HOST);

  const close = () => {
    if (loading) return;
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <Formik<HostCreateValues>
        initialValues={hostCreateInitialValues}
        validationSchema={hostCreateSchema}
        validateOnBlur
        validateOnChange
        onSubmit={async (values, { resetForm }) => {
          setError('');
          try {
            await submitHost({
              variables: toHostCreateVariables(values, submitForReviewRef.current),
            });
            onSaved();
            resetForm();
            close();
          } catch (err: any) {
            setError(err?.message || 'Failed to create host');
          }
        }}
      >
        {({ resetForm, submitForm }) => {
          const submitWithMode = (submitForReview: boolean) => {
            submitForReviewRef.current = submitForReview;
            submitForm();
          };
          return (
            <Form noValidate>
              <DialogTitle>Create Host (on behalf)</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <HostAccordionForm mode="create" userOptions={usersData?.users ?? []} />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  onClick={() => {
                    resetForm();
                    close();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => submitWithMode(false)}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={14} /> : undefined}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => submitWithMode(true)}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={14} /> : undefined}
                >
                  Submit for Review
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
