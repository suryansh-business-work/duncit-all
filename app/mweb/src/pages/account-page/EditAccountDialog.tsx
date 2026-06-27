import { useMemo } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { buildLocationTree, type LocationLike } from '../../utils/location-tree';
import {
  AccountEditForm,
  accountEditDefaults,
  toUpdateProfileInput,
  type AccountEditValues,
} from './account-edit';

const UPDATE_PROFILE = gql`
  mutation UpdateMyProfileFull($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      first_name
      last_name
      bio
      city
      state
      country
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      dob
    }
  }
`;

const LOCATIONS = gql`
  query EditProfileLocations {
    locations {
      id
      location_name
      city
      state
      state_code
      country
      country_code
      location_pincode
      location_zones {
        zone_name
        pincode
      }
    }
  }
`;

export interface EditAccountDialogProps {
  open: boolean;
  onClose: () => void;
  initial: Partial<AccountEditValues>;
  onSaved: () => void;
}

export default function EditAccountDialog({ open, onClose, initial, onSaved }: Readonly<EditAccountDialogProps>) {
  const [updateProfile, { loading, error }] = useMutation(UPDATE_PROFILE);
  const { data } = useQuery(LOCATIONS, { fetchPolicy: 'cache-and-network' });
  const countries = useMemo(
    () => buildLocationTree((data?.locations ?? []) as LocationLike[]),
    [data?.locations],
  );

  const handleSubmit = async (values: AccountEditValues) => {
    await updateProfile({ variables: { input: toUpdateProfileInput(values) } });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit profile</DialogTitle>
      <DialogContent dividers>
        <AccountEditForm
          countries={countries}
          defaultValues={accountEditDefaults(initial)}
          loading={loading}
          errorMessage={error?.message ?? null}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
