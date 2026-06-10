import { useState } from 'react';
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PetsIcon from '@mui/icons-material/Pets';
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

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <PetsIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }} fontWeight={700}>
            Pet Profile
          </Typography>
          {!editing && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                setSavedMsg(null);
                setEditing(true);
              }}
            >
              {hasPet ? 'Edit' : 'Add pet'}
            </Button>
          )}
        </Stack>

        {!editing ? (
          <PetSummary pet={pet} />
        ) : (
          <PetForm
            pet={pet}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              setSavedMsg('Pet profile saved');
              onSaved?.();
            }}
          />
        )}

        {savedMsg && !editing && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSavedMsg(null)}>
            {savedMsg}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
