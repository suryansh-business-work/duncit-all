import { useState } from 'react';
import { Alert, Avatar, Box, Stack, Typography } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';

interface Profile {
  name?: string;
  email?: string;
  picture?: string;
}

/** Decodes a JWT credential payload (no verification — display only). */
function decodeJwt(token: string): Profile {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
  } catch {
    return {};
  }
}

/** Runs a real Google sign-in and shows the resulting user profile. */
export default function GoogleOAuthTest() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState(false);

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <GoogleLogin
        onSuccess={(res) => {
          setError(false);
          if (res.credential) setProfile(decodeJwt(res.credential));
        }}
        onError={() => setError(true)}
        useOneTap={false}
      />
      {error && <Alert severity="error">Sign-in failed — check the client ID and authorised origins.</Alert>}
      {profile && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Avatar src={profile.picture} />
          <Box>
            <Typography variant="body2" fontWeight={700}>{profile.name}</Typography>
            <Typography variant="caption" color="text.secondary">{profile.email}</Typography>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
