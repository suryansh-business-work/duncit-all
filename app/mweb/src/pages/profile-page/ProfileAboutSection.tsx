import { useState } from 'react';
import { Alert, Link, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
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
    <Stack data-testid="profile-about-section" spacing={2}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Typography variant="subtitle2" sx={{
          color: "text.secondary"
        }}>
          Description and links
        </Typography>
        <DuncitButton
          data-testid="profile-about-section-edit"
          size="small"
          color="inherit"
          startIcon={<EditIcon />}
          onClick={() => setEditing(true)}
          sx={{ bgcolor: 'action.hover', minHeight: 36 }}
        >
          Edit
        </DuncitButton>
      </Stack>
      {me.bio ? (
        <Typography data-testid="profile-about-section-bio" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {me.bio}
        </Typography>
      ) : (
        <Typography data-testid="profile-about-section-bio" variant="body2" sx={{
          color: "text.secondary"
        }}>
          Add a short description so members know more about you.
        </Typography>
      )}
      {links.length > 0 && (
        <Stack data-testid="profile-about-section-links" direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          {links.map((link: any) => {
            const linkKey = `${link.label}-${link.url}`;
            return (
              <Link
                key={linkKey}
                data-testid={`profile-about-section-link-${linkKey}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </Link>
            );
          })}
        </Stack>
      )}
      {saved && (
        <Alert data-testid="profile-about-section-saved" severity="success" onClose={() => setSaved(false)}>
          Profile saved
        </Alert>
      )}
    </Stack>
  );
}
