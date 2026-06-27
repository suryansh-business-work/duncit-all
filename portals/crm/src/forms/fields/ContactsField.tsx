import { useFieldArray, useFormContext } from 'react-hook-form';
import { Box, Button, Card, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FormField from '../FormField';
import PhoneField from './PhoneField';
import type { CrmContact } from '../../api/crm.types';

export const emptyContact: CrmContact & { mobile_number_ext?: string; whatsapp_number_ext?: string } = {
  name: '',
  role: '',
  mobile_number: '',
  whatsapp_number: '',
  email: '',
  mobile_number_ext: '+91',
  whatsapp_number_ext: '+91',
};

interface Props {
  name: string;
}

/** Repeatable contact rows (index 0 is the primary contact). */
export default function ContactsField({ name }: Readonly<Props>) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <Stack spacing={1.5}>
      {fields.map((row, index) => {
        const isPrimary = index === 0;
        return (
          <Card key={row.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {isPrimary ? 'Primary Contact' : `Contact ${index + 1}`}
              </Typography>
              {!isPrimary && (
                <IconButton size="small" color="error" aria-label="remove contact" onClick={() => remove(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              <FormField name={`${name}.${index}.name`} label="Name" size="small" required={isPrimary} />
              <FormField name={`${name}.${index}.role`} label="Role / Designation" size="small" />
              <PhoneField name={`${name}.${index}.mobile_number`} label="Mobile Number" required={isPrimary} />
              <PhoneField name={`${name}.${index}.whatsapp_number`} label="WhatsApp Number" />
              <FormField name={`${name}.${index}.email`} label="Email" size="small" />
            </Box>
          </Card>
        );
      })}
      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        size="small"
        sx={{ alignSelf: 'flex-start' }}
        onClick={() => append({ ...emptyContact })}
      >
        Add Another Contact
      </Button>
    </Stack>
  );
}
