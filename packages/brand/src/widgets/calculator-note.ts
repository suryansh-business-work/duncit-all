/**
 * The status line under a calculator's figure (`campaign-calculator`,
 * `earnings-calculator`): the standard note, or a warning that changes the
 * answer — which is why warnings are drawn in the accent colour.
 */
export function setCalculatorNote(note: HTMLElement | null, text: string, warning: boolean): void {
  if (!note) return;
  note.textContent = text;
  note.className = `mt-5 text-xs ${warning ? 'font-semibold text-primary-dark' : 'text-ink-soft'}`;
}
