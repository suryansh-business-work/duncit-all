import { useState } from 'react';
import { Alert, Box, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import PetForm from './PetForm';
import PetSummary from './PetSummary';
import { PetProfile } from './petQueries';

interface Props {
  pet?: PetProfile | null;
  onSaved?: () => void;
}

export default function PetProfileSection({ pet, onSaved }: Readonly<Props>) {
  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const hasPet = !!(pet && (pet.name || pet.species || pet.bio || pet.photo_url));

  // Sits inside the "Pet profile" accordion, which already names it — so no
  // second card and no second title, just the action on the right.
  return (
    <Box>
      {!editing && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1.5 }}>
          <DuncitButton
            size="small"
            color="inherit"
            startIcon={<EditIcon />}
            onClick={() => {
              setSavedMsg(null);
              setEditing(true);
            }}
            sx={{ bgcolor: 'action.hover', minHeight: 36 }}
          >
            {hasPet ? 'Edit' : 'Add pet'}
          </DuncitButton>
        </Stack>
      )}

      {editing ? (
        <PetForm
          pet={pet}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSavedMsg('Pet profile saved');
            onSaved?.();
          }}
        />
      ) : (
        <PetSummary pet={pet} />
      )}

      {savedMsg && !editing && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSavedMsg(null)}>
          {savedMsg}
        </Alert>
      )}
    </Box>
  );
}
