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
