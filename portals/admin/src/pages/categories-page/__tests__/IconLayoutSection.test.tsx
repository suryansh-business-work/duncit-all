import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import IconLayoutSection from '../IconLayoutSection';
import { blankForm, type CategoryIconLayout, type FormState } from '../queries';
import { renderWithProviders } from './testkit';

const renderSection = (form: FormState) => {
  const onFormChange = vi.fn();
  const view = renderWithProviders(<IconLayoutSection form={form} onFormChange={onFormChange} />);
  return { ...view, onFormChange };
};

const widthField = () => screen.getByLabelText('Width') as HTMLInputElement;
const heightField = () => screen.getByLabelText('Height') as HTMLInputElement;
const positionButton = (name: string) => screen.getByRole('button', { name });

/** The most recent form the section handed back to its parent. */
const lastFormSentTo = (onFormChange: ReturnType<typeof vi.fn>): FormState =>
  onFormChange.mock.calls[onFormChange.mock.calls.length - 1][0] as FormState;

describe('IconLayoutSection', () => {
  it('defaults to the mWeb surface with TOP/40x40 when no layout is stored', () => {
    renderSection(blankForm);

    expect(positionButton('Top').getAttribute('aria-pressed')).toBe('true');
    expect(widthField().value).toBe('40');
    expect(heightField().value).toBe('40');
  });

  it('shows the stored mWeb layout', () => {
    const layout: CategoryIconLayout = { position: 'LEFT', width: 64, height: 48 };
    renderSection({ ...blankForm, icon_layout_mweb: layout });

    expect(positionButton('Left').getAttribute('aria-pressed')).toBe('true');
    expect(widthField().value).toBe('64');
    expect(heightField().value).toBe('48');
  });

  it('switches to the Native surface and shows its own layout independently of mWeb', () => {
    const mweb: CategoryIconLayout = { position: 'LEFT', width: 64, height: 48 };
    const native: CategoryIconLayout = { position: 'BOTTOM', width: 24, height: 24 };
    renderSection({ ...blankForm, icon_layout_mweb: mweb, icon_layout_native: native });

    fireEvent.click(screen.getByRole('button', { name: 'Native' }));

    expect(positionButton('Bottom').getAttribute('aria-pressed')).toBe('true');
    expect(widthField().value).toBe('24');
  });

  it('falls back to the TOP/40x40 default on the Native surface when it has no layout yet', () => {
    const mweb: CategoryIconLayout = { position: 'LEFT', width: 64, height: 48 };
    renderSection({ ...blankForm, icon_layout_mweb: mweb, icon_layout_native: null });

    fireEvent.click(screen.getByRole('button', { name: 'Native' }));

    expect(positionButton('Top').getAttribute('aria-pressed')).toBe('true');
    expect(widthField().value).toBe('40');
  });

  it('patches the mWeb layout position while preserving its size', () => {
    const mweb: CategoryIconLayout = { position: 'TOP', width: 64, height: 48 };
    const { onFormChange } = renderSection({ ...blankForm, icon_layout_mweb: mweb });

    fireEvent.click(screen.getByRole('button', { name: 'Bottom' }));

    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toEqual({
      position: 'BOTTOM',
      width: 64,
      height: 48,
    });
  });

  it('ignores a de-select click on the already-active position', () => {
    const { onFormChange } = renderSection(blankForm);

    fireEvent.click(positionButton('Top'));

    expect(onFormChange).not.toHaveBeenCalled();
  });

  it('ignores a de-select click on the already-active surface', () => {
    const { onFormChange } = renderSection(blankForm);

    fireEvent.click(screen.getByRole('button', { name: 'mWeb' }));
    expect(onFormChange).not.toHaveBeenCalled();

    // Still targeting mWeb: a size edit right after lands on icon_layout_mweb.
    fireEvent.change(widthField(), { target: { value: '90' } });
    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toMatchObject({ width: 90 });
  });

  it('patches the width and a blanked box falls back to zero', () => {
    const { onFormChange } = renderSection(blankForm);

    fireEvent.change(widthField(), { target: { value: '72' } });
    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toMatchObject({ width: 72, height: 40 });

    fireEvent.change(widthField(), { target: { value: '' } });
    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toMatchObject({ width: 0 });
  });

  it('patches the height and a blanked box falls back to zero', () => {
    const { onFormChange } = renderSection(blankForm);

    fireEvent.change(heightField(), { target: { value: '56' } });
    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toMatchObject({ height: 56, width: 40 });

    fireEvent.change(heightField(), { target: { value: '' } });
    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toMatchObject({ height: 0 });
  });

  it('writes position/size patches to the Native surface once it is selected, leaving mWeb untouched', () => {
    const { onFormChange } = renderSection(blankForm);

    fireEvent.click(screen.getByRole('button', { name: 'Native' }));
    fireEvent.click(screen.getByRole('button', { name: 'Right' }));

    expect(lastFormSentTo(onFormChange).icon_layout_native).toEqual({
      position: 'RIGHT',
      width: 40,
      height: 40,
    });
    expect(lastFormSentTo(onFormChange).icon_layout_mweb).toBeNull();
  });
});
