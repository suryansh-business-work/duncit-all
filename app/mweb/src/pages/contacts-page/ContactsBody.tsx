import ContactRow from './ContactRow';
import type { ContactRow as ContactRowData } from './queries';
import VirtualRows from './VirtualRows';

/** Avatar + two lines + 8px above and below. Measured once mounted. */
const ROW_ESTIMATE = 68;

const keyOf = (row: ContactRowData) => row.profile.user_id;

interface Props {
  rows: ContactRowData[];
  /** The tab and search that produced `rows`. */
  resetKey: string;
  onToggleFollow: (row: ContactRowData) => Promise<void>;
  onOpen: (userId: string) => void;
}

/** The matched contacts under the radar, windowed so thousands scroll freely.
 * The page renders the empty state when there are none. Twin of the matched
 * rows in native `ContactsFeed` (rule 27). */
export default function ContactsBody({ rows, resetKey, onToggleFollow, onOpen }: Readonly<Props>) {
  return (
    <VirtualRows
      testId="contacts-list"
      rows={rows}
      keyOf={keyOf}
      estimate={ROW_ESTIMATE}
      resetKey={resetKey}
      renderRow={(row) => <ContactRow row={row} onToggleFollow={onToggleFollow} onOpen={onOpen} />}
    />
  );
}
