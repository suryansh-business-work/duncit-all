import { Stack } from '@mui/material';

import type { Verification } from '../types';
import AddressCard from './AddressCard';
import EmailCard from './EmailCard';
import IdentityCard from './IdentityCard';

interface Props {
  items: readonly Verification[];
  /** Called after a submission lands, so the host can refetch and toast. */
  onChanged: () => void;
  onError: (msg: string) => void;
}

/**
 * The three verification rows, in the order the server returns them.
 *
 * The type → card mapping lives here rather than in each page: mWeb and the
 * partner console rendered the same switch, and one of them fell behind when
 * Email grew a note.
 */
export default function VerificationCards({ items, onChanged, onError }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      {items.map((item) => {
        if (item.type === 'IDENTITY') {
          return (
            <IdentityCard key={item.type} item={item} onChanged={onChanged} onError={onError} />
          );
        }
        if (item.type === 'ADDRESS') {
          return (
            <AddressCard key={item.type} item={item} onChanged={onChanged} onError={onError} />
          );
        }
        return <EmailCard key={item.type} item={item} />;
      })}
    </Stack>
  );
}
