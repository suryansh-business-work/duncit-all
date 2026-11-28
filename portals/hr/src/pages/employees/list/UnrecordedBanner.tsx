import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, List, ListItem, ListItemText } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { HR_UNRECORDED_EMPLOYEES, type UnrecordedData } from '../../../lib/employee-queries';

/**
 * Accounts that can open the Employee console but have no HR record — people
 * given the role before HR records existed, or by an admin directly. Each one
 * opens the hire form with that account already picked. Renders nothing when
 * there are none.
 */
export default function UnrecordedBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery<UnrecordedData>(HR_UNRECORDED_EMPLOYEES, { fetchPolicy: 'cache-and-network' });
  const people = data?.hrUnrecordedEmployees ?? [];
  if (people.length === 0) return null;

  return (
    <Alert severity="warning" data-testid="hr-unrecorded-banner">
      <AlertTitle>{t('hrEmployee.list.unrecordedTitle')}</AlertTitle>
      {t('hrEmployee.list.unrecordedBody')}
      <List dense>
        {people.map((person) => (
          <ListItem
            key={person.id}
            disableGutters
            secondaryAction={
              <DuncitButton size="small" startIcon={<PersonAddIcon />} onClick={() => navigate('/employees/new', { state: { account: person } })} data-testid={`hr-unrecorded-add-${person.id}`}>
                {t('hrEmployee.list.addRecord')}
              </DuncitButton>
            }
          >
            <ListItemText primary={person.name} secondary={person.email} />
          </ListItem>
        ))}
      </List>
    </Alert>
  );
}
