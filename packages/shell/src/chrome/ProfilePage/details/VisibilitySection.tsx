import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { SwitchRow } from '../notifications/SwitchRow';
import { ProfileSection } from '../ProfileSection';
import { SET_PROFILE_VISIBILITY } from '../queries';

interface Props {
  visibility: string | null;
  /** Reload the details query — the mutation answers by user_id, which the
   * cache does not normalise onto `me`. */
  onChanged: () => Promise<unknown>;
}

/**
 * Public or private profile — the same switch mWeb's account page has. A
 * private profile hides posts and status from people who do not follow the
 * account; the name and photo stay visible.
 */
export function VisibilitySection({ visibility, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [setVisibility, { loading }] = useMutation(SET_PROFILE_VISIBILITY);

  const change = (makePrivate: boolean) => {
    setError(null);
    setVisibility({ variables: { visibility: makePrivate ? 'PRIVATE' : 'PUBLIC' } })
      .then(onChanged)
      .catch((e) => setError(parseApiError(e, t('shell.profile.genericError'))));
  };

  return (
    <ProfileSection testId="profile-visibility" title={t('shell.profile.details.privacyTitle')}>
      {error && <Alert severity="error">{error}</Alert>}
      <SwitchRow
        testId="profile-visibility-switch"
        label={t('shell.profile.details.privateLabel')}
        description={t('shell.profile.details.privateHint')}
        checked={visibility === 'PRIVATE'}
        locked={false}
        busy={loading}
        onChange={change}
      />
    </ProfileSection>
  );
}
