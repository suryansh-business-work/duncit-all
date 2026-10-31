/**
 * `MediaListField` belongs to @duncit/media-picker and is tested there. This
 * stand-in keeps its contract — one URL per line — in a textarea, so a test
 * can add, remove and reorder items by editing the text, and the portal's own
 * conversion between those lines and its typed media rows stays under test.
 *
 * Swap it in with:
 *   vi.mock('@duncit/media-picker', async (importOriginal) => ({
 *     ...(await importOriginal<typeof import('@duncit/media-picker')>()),
 *     MediaListField: (await import('../mocks/media-list-field.mock')).MediaListFieldStub,
 *   }));
 */
export interface MediaListFieldStubProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helperText?: string;
  buttonLabel?: string;
  folder?: string;
}

export function MediaListFieldStub({ label, value, onChange, helperText, buttonLabel, folder }: Readonly<MediaListFieldStubProps>) {
  return (
    <div data-testid="media-list" data-folder={folder}>
      <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button">{buttonLabel}</button>
      {helperText && <span data-testid="media-list-help">{helperText}</span>}
    </div>
  );
}
