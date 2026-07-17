/** Stub for @duncit/media-picker's SingleImageUploadField. */

export function SingleImageUploadField({ value, onChange, label, buttonLabel }: any) {
  return (
    <div data-testid="image-upload">
      <span>{label}</span>
      <button type="button" onClick={() => onChange('https://img.example/new.png')}>
        {buttonLabel ?? 'Upload'}
      </button>
      <span data-testid="image-value">{value}</span>
    </div>
  );
}

export default SingleImageUploadField;
