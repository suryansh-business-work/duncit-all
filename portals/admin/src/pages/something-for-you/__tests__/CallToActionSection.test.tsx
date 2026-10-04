import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SOMETHING_FOR_YOU_ROUTES } from '@duncit/utils';
import CallToActionSection from '../CallToActionSection';
import { emptyItem, type SomethingForYouForm } from '../queries';

/** Holds the form like the page does, and records every value handed back. */
function Harness({
  initial,
  onChange,
}: Readonly<{ initial: SomethingForYouForm; onChange: (next: SomethingForYouForm) => void }>) {
  const [form, setForm] = useState(initial);
  return (
    <CallToActionSection
      form={form}
      setForm={(next) => {
        onChange(next);
        setForm(next);
      }}
    />
  );
}

const renderSection = (initial: Partial<SomethingForYouForm> = {}) => {
  const onChange = vi.fn();
  render(<Harness initial={{ ...emptyItem, ...initial }} onChange={onChange} />);
  return { onChange };
};

const screenPicker = () => screen.getByRole('combobox', { name: 'Opens this screen' });

/** Types into the picker the way a person does: focus it, then type. */
const search = (term: string) => {
  fireEvent.focus(screenPicker());
  fireEvent.change(screenPicker(), { target: { value: term } });
};

/** Each listed option as "label path", the two lines the row renders. */
const listedOptions = () =>
  within(screen.getByRole('listbox'))
    .getAllByRole('option')
    .map((option) => option.textContent);

describe('CallToActionSection', () => {
  it('starts decorative and switches to a web link the admin can type', () => {
    const { onChange } = renderSection();

    expect(
      screen.getByText('The card is decorative — pressing it does nothing.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Web link' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ action_type: 'URL' }));

    fireEvent.change(screen.getByLabelText('Opens this address'), {
      target: { value: 'https://duncit.com/offer' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ action_type: 'URL', link_url: 'https://duncit.com/offer' }),
    );
  });

  it('ignores a click on the already-selected action instead of clearing it', () => {
    const { onChange } = renderSection({ action_type: 'URL' });

    fireEvent.click(screen.getByRole('button', { name: 'Web link' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Opens this address')).toBeInTheDocument();
  });

  it('lists every in-app screen with its path when nothing is typed', () => {
    renderSection({ action_type: 'ROUTE' });

    fireEvent.mouseDown(screenPicker());

    const options = listedOptions();
    expect(options).toHaveLength(SOMETHING_FOR_YOU_ROUTES.length);
    expect(options).toContain('Refer and earn/referral');
    expect(options).toContain('Share feedback/support/feedback');
  });

  it('finds a screen by its path as well as by its name', () => {
    renderSection({ action_type: 'ROUTE' });

    search('REFERRAL');
    expect(listedOptions()).toEqual(['Refer and earn/referral']);

    search('  pod shop ');
    expect(listedOptions()).toEqual(['Pod Shop/shop']);
  });

  it('stores the picked screen as its path and shows the saved one by name', () => {
    const { onChange } = renderSection({ action_type: 'ROUTE', link_path: '/clubs' });

    expect(screenPicker()).toHaveValue('Clubs');

    search('earn with');
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option'));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ action_type: 'ROUTE', link_path: '/earn' }),
    );
    expect(screenPicker()).toHaveValue('Earn with Duncit');
  });

  it('clears the stored path when the picked screen is removed', () => {
    const { onChange } = renderSection({ action_type: 'ROUTE', link_path: '/clubs' });

    fireEvent.click(screen.getByTitle('Clear'));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ link_path: '' }));
  });
});
