const FOCUSABLE = 'input:not([type="hidden"]), textarea, [role="combobox"]';

/**
 * Scroll to, and focus, the first field a failed Save left in error.
 *
 * React Hook Form's own `shouldFocusError` only reaches fields that hand it a
 * DOM ref, and most of a console editor's composite fields (account picker,
 * category, location, chip lists) do not — so an admin pressing Save at the foot
 * of a tall page saw nothing happen. This reads what MUI already marked
 * instead, in DOM order, which is also the order the person reads the page in.
 *
 * Answers whether there was one, so a Save that passed validation and failed on
 * the server can reveal its error instead.
 */
export function revealFirstInvalid(form: HTMLFormElement | null): boolean {
  const marked = form?.querySelector<HTMLElement>('[aria-invalid="true"], .Mui-error');
  if (!marked) return false;
  const field = marked.closest<HTMLElement>('.MuiFormControl-root') ?? marked;
  field.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const target = marked.matches(FOCUSABLE) ? marked : field.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
  return true;
}
