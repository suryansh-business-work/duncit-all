import { CircularProgress } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { DuncitButton } from '@duncit/buttons';

/** Shared sx for the row's text buttons: the row is already a large tappable
 * card (and an unread one carries a gradient), so a solid button fights it. */
const TEXT_BUTTON = { fontWeight: 800, textTransform: 'none' } as const;

interface AnswerButtonsProps {
  /** Accept leads in the accent ink; Deny sits back in the quiet one. Both are
   * decided by the parent so the two branches cannot drift apart. */
  accentInk: string;
  quietInk: string;
  /** An unread row is painted with the primary gradient, so Deny is dimmed
   * rather than recoloured — a palette grey disappears on it. */
  dimQuiet: boolean;
  /** Any action on the row is in flight, so nothing here accepts a tap. */
  busy: boolean;
  /** THIS action is the one in flight — only it wears the spinner, so a row
   * offering three buttons never shows two at once. */
  spinning: boolean;
  acceptLabel: string;
  denyLabel: string;
  onAccept: () => void;
  onDeny: () => void;
}

/**
 * Accept / Deny — the private profile's whole gate, since accepting is what
 * CREATES the follow edge.
 */
export function AnswerButtons({
  accentInk,
  quietInk,
  dimQuiet,
  busy,
  spinning,
  acceptLabel,
  denyLabel,
  onAccept,
  onDeny,
}: Readonly<AnswerButtonsProps>) {
  return (
    <>
      <DuncitButton
        size="small"
        variant="text"
        disabled={busy}
        startIcon={spinning ? <CircularProgress size={13} color="inherit" /> : undefined}
        onClick={onAccept}
        sx={{ ...TEXT_BUTTON, color: accentInk }}
      >
        {acceptLabel}
      </DuncitButton>
      <DuncitButton
        size="small"
        variant="text"
        disabled={busy}
        onClick={onDeny}
        sx={{ ...TEXT_BUTTON, color: quietInk, opacity: dimQuiet ? 0.75 : 1 }}
      >
        {denyLabel}
      </DuncitButton>
    </>
  );
}

interface FollowBackButtonProps {
  accentInk: string;
  busy: boolean;
  spinning: boolean;
  /** True once the viewer's own ask is open — the button reads "Requested" and
   * stops accepting taps, because there is nothing left to send. */
  pending: boolean;
  label: string;
  onFollowBack: () => void;
}

/**
 * Follow Back. It carries the person-add icon so it reads as a different kind
 * of action from Accept / Deny when all three sit on the same row.
 */
export function FollowBackButton({
  accentInk,
  busy,
  spinning,
  pending,
  label,
  onFollowBack,
}: Readonly<FollowBackButtonProps>) {
  return (
    <DuncitButton
      size="small"
      variant="text"
      disabled={busy || pending}
      startIcon={
        spinning ? (
          <CircularProgress size={13} color="inherit" />
        ) : (
          <PersonAddAlt1Icon fontSize="small" />
        )
      }
      onClick={onFollowBack}
      sx={{ ...TEXT_BUTTON, color: accentInk }}
    >
      {label}
    </DuncitButton>
  );
}
