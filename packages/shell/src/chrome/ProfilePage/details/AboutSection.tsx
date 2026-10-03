import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { useUserData } from '@duncit/user-context';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import { UPDATE_MY_PROFILE, type ProfileDetails } from '../queries';
import { AboutView } from './AboutView';
import {
  buildProfileDetailsInput,
  profileDetailsDefaults,
  ProfileDetailsForm,
  type ProfileDetailsValues,
} from './profile-details';

interface Props {
  details: ProfileDetails | null;
  /** Reload the details query once a save lands. */
  onSaved: () => Promise<unknown>;
}

/** Photo, name, bio and links: read, then Edit → the form → read again. */
export function AboutSection({ details, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user, refetch } = useUserData();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [save] = useMutation(UPDATE_MY_PROFILE);

  const submit = async (values: ProfileDetailsValues) => {
    try {
      await save({ variables: { input: buildProfileDetailsInput(values) } });
    } catch (e) {
      throw new Error(parseApiError(e, t('shell.profile.genericError')));
    }
    // The save already landed; a failed reload only leaves a stale view.
    await Promise.allSettled([refetch(), onSaved()]);
    setEditing(false);
    setSaved(true);
  };

  const editButton = editing ? null : (
    <DuncitButton
      data-testid="account-edit"
      size="small"
      startIcon={<EditIcon />}
      onClick={() => {
        setSaved(false);
        setEditing(true);
      }}
    >
      {t('shell.common.edit')}
    </DuncitButton>
  );

  return (
    <ProfileSection
      testId="profile-about"
      title={t('shell.profile.details.aboutTitle')}
      description={t('shell.profile.details.aboutHint')}
      action={editButton}
    >
      {saved && (
        <Alert data-testid="profile-saved" severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          {t('shell.profile.updated')}
        </Alert>
      )}
      {editing ? (
        <ProfileDetailsForm
          defaultValues={profileDetailsDefaults(user, details)}
          onSubmit={submit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <AboutView bio={details?.bio ?? null} links={details?.profile_links ?? []} />
      )}
    </ProfileSection>
  );
}
