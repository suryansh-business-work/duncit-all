/**
 * The parts of CategoryFormDialog the broad CategoryFormDialog.test.tsx suite
 * never reaches: the min-pax field and its clamp, an inactive record's Status,
 * closing from Escape, and the gift card artwork fields writing back.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import CategoryFormDialog, { MIN_PAX_CEILING, MIN_PAX_FLOOR, clampMinPax } from '../CategoryFormDialog';
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
  parentId: 'c1',
  form: { ...blankForm, name: 'Doubles', ...form },
});

const renderDialog = (dialog: DialogState) => {
  const setDialog = vi.fn();
  renderWithProviders(
    <CategoryFormDialog dialog={dialog} setDialog={setDialog} busy={false} opError={null} onSubmit={vi.fn()} />,
  );
  return setDialog;
};

/** The form the dialog handed back to its parent on the most recent write. */
const lastForm = (setDialog: ReturnType<typeof vi.fn>) => (setDialog.mock.lastCall?.[0] as DialogState).form;

describe('clampMinPax', () => {
  it('keeps a whole number inside the bounds the server accepts', () => {
    expect(clampMinPax('4')).toBe(4);
    expect(clampMinPax('4.9')).toBe(4);
    expect(clampMinPax('')).toBe(MIN_PAX_FLOOR);
    expect(clampMinPax('-3')).toBe(MIN_PAX_FLOOR);
    expect(clampMinPax('75')).toBe(MIN_PAX_CEILING);
  });

  it('reads a number too large to represent as the floor', () => {
    expect(clampMinPax('1e400')).toBe(MIN_PAX_FLOOR);
  });
});

describe('CategoryFormDialog — min pax on a sub-category', () => {
  it('writes the typed minimum back clamped to the allowed range', () => {
    const setDialog = renderDialog(dialogState('SUB', { min_pax: 0 }));
    const field = screen.getByLabelText('Min number of pax allowed');

    fireEvent.change(field, { target: { value: '4' } });
    expect(lastForm(setDialog).min_pax).toBe(4);

    fireEvent.change(field, { target: { value: '120' } });
    expect(lastForm(setDialog).min_pax).toBe(MIN_PAX_CEILING);
  });

  it('is offered on sub-categories only', () => {
    renderDialog(dialogState('CATEGORY'));
    expect(screen.queryByLabelText('Min number of pax allowed')).toBeNull();
  });
});

describe('CategoryFormDialog — status of an inactive record', () => {
  it('shows Inactive and maps a switch back to Active onto the boolean', () => {
    const setDialog = renderDialog(dialogState('SUPER', { id: 's1', is_active: false }));
    const status = screen.getByLabelText('Status');
    expect(status).toHaveTextContent('Inactive');

    fireEvent.mouseDown(status);
    fireEvent.click(screen.getByRole('option', { name: 'Active' }));

    expect(lastForm(setDialog).is_active).toBe(true);
  });
});

describe('CategoryFormDialog — closing and gift card artwork', () => {
  it('closes from Escape like it does from Cancel', () => {
    const setDialog = renderDialog(dialogState('SUPER'));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(setDialog).toHaveBeenCalledWith(null);
  });

  it('writes both gift card faces back onto the form', () => {
    const setDialog = renderDialog(dialogState('CATEGORY'));

    fireEvent.change(screen.getByRole('textbox', { name: 'Gift card front image' }), {
      target: { value: 'https://cdn.duncit.com/gift/front.png' },
    });
    expect(lastForm(setDialog).gift_card_image_front).toBe('https://cdn.duncit.com/gift/front.png');

    fireEvent.change(screen.getByRole('textbox', { name: 'Gift card back image' }), {
      target: { value: 'https://cdn.duncit.com/gift/back.png' },
    });
    expect(lastForm(setDialog).gift_card_image_back).toBe('https://cdn.duncit.com/gift/back.png');
  });
});
