import EditNoteIcon from '@mui/icons-material/EditNote';
import { DuncitButton } from '@duncit/buttons';

/**
 * The Club Admin's by-name door, as a page-level action.
 *
 * Its own file for the same reason `ScanCta` sits beside the notices: the page
 * is at the project's 200-line ceiling for a `.tsx`, and a button nested in it
 * would also be a component defined inside a component (Sonar S6478).
 *
 * It renders directly under the earnings notice because it is the answer to
 * the call the admin is on — the host never scanned somebody, and that
 * somebody is standing there giving their name.
 */
export default function DirectMarkCta({
  label,
  onOpen,
}: Readonly<{ label: string; onOpen: () => void }>) {
  return (
    <DuncitButton
      variant="outlined"
      onClick={onOpen}
      startIcon={<EditNoteIcon />}
      data-testid="attendance-direct-cta"
      sx={{ alignSelf: 'flex-start', borderRadius: 999, fontWeight: 800 }}
    >
      {label}
    </DuncitButton>
  );
}
