/** Stub for @duncit/media-picker's SingleImageUploadField. */

export function SingleImageUploadField({
  value,
  onChange,
  label,
  buttonLabel,
  helperText,
  error,
}: any) {
  return (
    <div data-testid="image-upload">
      <span>{label}</span>
      <button type="button" onClick={() => onChange('https://img.example/new.png')}>
        {buttonLabel ?? 'Upload'}
      </button>
      <span data-testid="image-value">{value}</span>
      {/* The real field renders this, and it is where a form's upload hint —
          and the validation message that replaces it — is read. A stub that
          dropped it left both untestable. */}
      {helperText ? (
        <p data-testid="image-helper" data-error={error ? 'true' : undefined}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default SingleImageUploadField;

/**
 * Stub for @duncit/media-picker's MediaPickerDialog (the rental proof photos use
 * it through @duncit/venue-food's photo field). Open, it offers one button that
 * "uploads" a fresh ImageKit URL, so a form's photo limit can be driven for real.
 */
let pickedCount = 0;
export function MediaPickerDialog({ open, onPicked, title }: any) {
  if (!open) return null;
  return (
    <div role="dialog" aria-label={title}>
      <button
        type="button"
        onClick={() => {
          pickedCount += 1;
          onPicked(`https://ik.imagekit.io/duncit/proof-${pickedCount}.jpg`);
        }}
      >
        pick photo
      </button>
    </div>
  );
}

/** The rich-text editor's direct upload: never reached by the finance suites. */
export const useImagekitDirectUpload = () => ({ upload: async () => '', uploading: false });
