import { useState } from 'react';
import { Alert, Button, Link, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ProfileAboutEditForm from './ProfileAboutEditForm';

export default function ProfileAboutSection({ me, onSaved }: Readonly<{ me: any; onSaved: () => void }>) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const links = me.profile_links ?? [];

  if (editing) {
    return (
      <ProfileAboutEditForm
        bio={me.bio ?? ''}
        links={links}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          setSaved(true);
          onSaved();
        }}
      />
    );
  }

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
      {saved && (
        <Alert severity="success" onClose={() => setSaved(false)}>
          Profile saved
        </Alert>
      )}
    </Stack>
  );
}
