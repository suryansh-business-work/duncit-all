import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import CategoryFormDialog from '../CategoryFormDialog';
import { blankForm, type FormState, type Level } from '../queries';
import { renderWithProviders } from './testkit';

// The shared media picker dialog owns its own upload/Pexels queries; the field
// wrapper (label + input) that this dialog actually drives stays real.
vi.mock('@duncit/media-picker', () => ({ default: () => null }));

interface DialogState {
  open: boolean;
  level: Level;
  parentId: string | null;
  form: FormState;
}

const dialogState = (level: Level, form: Partial<FormState> = {}): DialogState => ({
  open: true,
  level,
  parentId: null,
  form: { ...blankForm, name: 'Cricket', ...form },
});

const renderDialog = (
  dialog: DialogState | null,
  extra: Readonly<{ busy?: boolean; opError?: string | null }> = {}
) => {
  const setDialog = vi.fn();
  const onSubmit = vi.fn();
  const view = renderWithProviders(
    <CategoryFormDialog
      dialog={dialog}
      setDialog={setDialog}
      busy={extra.busy ?? false}
      opError={extra.opError ?? null}
      onSubmit={onSubmit}
    />
  );
  return { ...view, setDialog, onSubmit };
};

/** The single form object the component handed back to its parent. */
const formSentTo = (setDialog: ReturnType<typeof vi.fn>): FormState =>
  (setDialog.mock.calls[0][0] as DialogState).form;

const saveButton = () => screen.getByRole('button', { name: /save|saving/i }) as HTMLButtonElement;

describe('CategoryFormDialog', () => {
  it('renders nothing until a dialog state exists', () => {
    renderDialog(null);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('titles itself by level and by create-vs-edit', () => {
    const superView = renderDialog(dialogState('SUPER'));
    expect(screen.getByText('New Super Category')).toBeTruthy();
    superView.unmount();

    const catView = renderDialog(dialogState('CATEGORY', { id: 'c1' }));
    expect(screen.getByText('Edit Category')).toBeTruthy();
    catView.unmount();

    renderDialog(dialogState('SUB'));
    expect(screen.getByText('New Sub-Category')).toBeTruthy();
  });

  it('reports a typed name back to the parent without losing the rest of the form', () => {
    const { setDialog } = renderDialog(dialogState('SUPER', { description: 'keep me' }));

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Football' } });

    expect(setDialog).toHaveBeenCalledTimes(1);
    expect(formSentTo(setDialog).name).toBe('Football');
    expect(formSentTo(setDialog).description).toBe('keep me');
  });

  it('offers the Material icon picker in ICON mode', () => {
    renderDialog(dialogState('SUPER', { iconMode: 'ICON', icon: 'Pets' }));

    expect(screen.getByLabelText('Icon')).toBeTruthy();
    expect(screen.queryByLabelText('Category image')).toBeNull();
    expect(screen.getByText('Material icon: Pets')).toBeTruthy();
  });

  it('stores a Material icon name typed into the picker', () => {
    const { setDialog } = renderDialog(dialogState('SUPER', { iconMode: 'ICON', icon: '' }));

    fireEvent.change(screen.getByLabelText('Icon'), { target: { value: 'SportsSoccer' } });

    expect(formSentTo(setDialog).icon).toBe('SportsSoccer');
    expect(formSentTo(setDialog).iconMode).toBe('ICON');
  });

  it('stores an image URL pasted into the image field', () => {
    const { setDialog } = renderDialog(dialogState('SUPER', { iconMode: 'IMAGE', icon: '' }));

    fireEvent.change(screen.getByLabelText('Category image'), {
      target: { value: 'https://cdn.test/icon.png' },
    });

    expect(formSentTo(setDialog).icon).toBe('https://cdn.test/icon.png');
  });

  it('swaps to the image field and clears the icon when IMAGE is chosen', () => {
    const { setDialog } = renderDialog(dialogState('SUPER', { iconMode: 'ICON', icon: 'Pets' }));

    fireEvent.click(screen.getByRole('button', { name: 'Image' }));

    expect(formSentTo(setDialog).iconMode).toBe('IMAGE');
    expect(formSentTo(setDialog).icon).toBe('');
  });

  it('ignores a de-select click on the already-active icon mode', () => {
    const { setDialog } = renderDialog(dialogState('SUPER', { iconMode: 'ICON' }));

    fireEvent.click(screen.getByRole('button', { name: 'MUI Icon' }));

    expect(setDialog).not.toHaveBeenCalled();
  });

  it('renders the image field in IMAGE mode', () => {
    renderDialog(dialogState('SUPER', { iconMode: 'IMAGE', icon: 'https://cdn.test/i.png' }));

    expect((screen.getByLabelText('Category image') as HTMLInputElement).value).toBe(
      'https://cdn.test/i.png'
    );
    expect(screen.queryByLabelText('Icon')).toBeNull();
  });

  it('offers icon layout on CATEGORY only', () => {
    const { unmount } = renderDialog(dialogState('CATEGORY'));
    expect(screen.getByText('Icon layout')).toBeTruthy();
    unmount();

    renderDialog(dialogState('SUPER'));
    expect(screen.queryByText('Icon layout')).toBeNull();
  });

  it('edits description and the media URL block', () => {
    const { setDialog } = renderDialog(dialogState('SUPER'));

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'All cricket' } });
    expect(formSentTo(setDialog).description).toBe('All cricket');

    setDialog.mockClear();
    fireEvent.change(screen.getByLabelText(/Images & Videos/), {
      target: { value: 'https://cdn.test/a.jpg' },
    });
    expect(formSentTo(setDialog).mediaText).toBe('https://cdn.test/a.jpg');
  });

  it('coerces the sort order to a number and blanks to zero', () => {
    const { setDialog } = renderDialog(dialogState('SUPER', { sort_order: 3 }));

    fireEvent.change(screen.getByLabelText('Sort order'), { target: { value: '7' } });
    expect(formSentTo(setDialog).sort_order).toBe(7);

    setDialog.mockClear();
    fireEvent.change(screen.getByLabelText('Sort order'), { target: { value: '' } });
    expect(formSentTo(setDialog).sort_order).toBe(0);
  });

  it('offers Status only on an existing record and maps it back to a boolean', () => {
    const { unmount } = renderDialog(dialogState('SUPER'));
    expect(screen.queryByLabelText('Status')).toBeNull();
    unmount();

    const { setDialog } = renderDialog(dialogState('SUPER', { id: 's1', is_active: true }));
    fireEvent.mouseDown(screen.getByLabelText('Status'));
    fireEvent.click(screen.getByRole('option', { name: 'Inactive' }));

    expect(formSentTo(setDialog).is_active).toBe(false);
  });

  it('keeps co-host controls off SUPER and CATEGORY', () => {
    const { unmount } = renderDialog(dialogState('CATEGORY'));
    expect(screen.queryByLabelText('Allow Co-Hosts')).toBeNull();
    unmount();

    renderDialog(dialogState('SUPER'));
    expect(screen.queryByLabelText('Allow Co-Hosts')).toBeNull();
  });

  it('reveals the co-host limit on SUB only once co-hosting is switched on', () => {
    const { unmount } = renderDialog(dialogState('SUB', { allow_co_hosts: false }));
    expect(screen.getByLabelText('Allow Co-Hosts')).toBeTruthy();
    expect(screen.queryByLabelText('Max co-hosts per pod')).toBeNull();
    unmount();

    renderDialog(dialogState('SUB', { allow_co_hosts: true, max_co_hosts: 2 }));
    expect(screen.getByLabelText('Max co-hosts per pod')).toBeTruthy();
  });

  it('switches co-hosting on and picks a limit', () => {
    const switchView = renderDialog(dialogState('SUB', { allow_co_hosts: false }));
    fireEvent.click(screen.getByLabelText('Allow Co-Hosts'));
    expect(formSentTo(switchView.setDialog).allow_co_hosts).toBe(true);
    switchView.unmount();

    const withLimit = renderDialog(dialogState('SUB', { allow_co_hosts: true, max_co_hosts: 1 }));
    fireEvent.mouseDown(screen.getByLabelText('Max co-hosts per pod'));
    fireEvent.click(screen.getByRole('option', { name: '4' }));
    expect(formSentTo(withLimit.setDialog).max_co_hosts).toBe(4);
  });

  it('shows the operation error', () => {
    renderDialog(dialogState('SUPER'), { opError: 'name already taken' });

    expect(screen.getByText('name already taken')).toBeTruthy();
  });

  it('blocks Save on a blank or whitespace-only name', () => {
    const { unmount } = renderDialog(dialogState('SUPER', { name: '' }));
    expect(saveButton().disabled).toBe(true);
    unmount();

    renderDialog(dialogState('SUPER', { name: '   ' }));
    expect(saveButton().disabled).toBe(true);
  });

  it('submits a named form and shows the busy label while saving', () => {
    const idle = renderDialog(dialogState('SUPER', { name: 'Cricket' }));
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    expect(idle.onSubmit).toHaveBeenCalledTimes(1);
    idle.unmount();

    renderDialog(dialogState('SUPER', { name: 'Cricket' }), { busy: true });
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('closes the dialog from Cancel', () => {
    const { setDialog } = renderDialog(dialogState('SUPER'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(setDialog).toHaveBeenCalledWith(null);
  });
});
