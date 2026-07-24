import { Stack } from '@mui/material';
import AddressBookSection from './account-page/AddressBookSection';

/** Address Book — the user's saved delivery addresses, now a standalone page
 * reachable from the sidebar Shop section (previously embedded in the Account
 * page). mWeb twin of the mobile AddressBookScreen. */
export default function AddressBookPage() {
  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <AddressBookSection />
    </Stack>
  );
}
