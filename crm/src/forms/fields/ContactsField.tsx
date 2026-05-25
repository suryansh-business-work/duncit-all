import { FieldArray, useField } from 'formik';
import { Box, Button, Card, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FormField from '../FormField';
import type { CrmContact } from '../../api/crm.types';

export const emptyContact: CrmContact = { name: '', role: '', mobile_number: '', whatsapp_number: '', email: '' };

interface Props {
  name: string;
}

/** Repeatable contact rows (index 0 is the primary contact). */
export default function ContactsField({ name }: Props) {
  const [field] = useField<CrmContact[]>(name);
  const contacts = field.value ?? [];
  return (
    <FieldArray name={name}>
      {(arrayHelpers) => (
        <Stack spacing={1.5}>
          {contacts.map((_, index) => (
            <Card key={index} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{index === 0 ? 'Primary Contact' : `Contact ${index + 1}`}</Typography>
                {index > 0 && (
                  <IconButton size="small" color="error" aria-label="remove contact" onClick={() => arrayHelpers.remove(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                <FormField name={`${name}.${index}.name`} label="Name" size="small" />
                <FormField name={`${name}.${index}.role`} label="Role / Designation" size="small" />
                <FormField name={`${name}.${index}.mobile_number`} label="Mobile Number" size="small" />
                <FormField name={`${name}.${index}.whatsapp_number`} label="WhatsApp Number" size="small" />
                <FormField name={`${name}.${index}.email`} label="Email" size="small" />
              </Box>
            </Card>
          ))}
          <Button startIcon={<AddIcon />} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => arrayHelpers.push({ ...emptyContact })}>
            Add Another Contact
          </Button>
        </Stack>
      )}
    </FieldArray>
  );
}
