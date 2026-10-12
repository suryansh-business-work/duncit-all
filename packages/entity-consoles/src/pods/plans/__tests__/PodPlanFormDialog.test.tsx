import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PodPlanFormDialog from '../PodPlanFormDialog';
import type { PodPlanFormValues } from '../pod-plan';

const EDITING: PodPlanFormValues & { id: string } = {
  id: 'plan-1',
  key: 'premium',
  name: 'Premium',
  description: 'Priority booking',
  image_url: 'https://cdn.test/premium.png',
  features: ['Priority booking', 'Early access'],
  price_label: '₹199 / month',
  sort_order: 2,
  is_coming_soon: false,
  is_active: true,
};

const mount = (over: Partial<Parameters<typeof PodPlanFormDialog>[0]> = {}) => {
  const props = {
    open: true,
    editing: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(async () => undefined),
    ...over,
  };
  const view = render(<PodPlanFormDialog {...props} />);
  return { ...view, props };
};

const field = (name: RegExp | string) => screen.getByRole('textbox', { name });

describe('PodPlanFormDialog', () => {
  it('opens a blank "New plan" form with an editable key', () => {
    mount();

    expect(screen.getByText('New plan')).toBeInTheDocument();
    expect(field(/^Key/)).toBeEnabled();
    expect(field(/^Key/)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create plan' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Active' })).toBeChecked();
  });

  it('loads an existing plan, with its key locked and its features one per line', () => {
    mount({ editing: EDITING });

    expect(screen.getByText('Edit plan')).toBeInTheDocument();
    expect(field(/^Key/)).toBeDisabled();
    expect(field(/^Key/)).toHaveValue('premium');
    expect(field(/Display name/i)).toHaveValue('Premium');
    expect(screen.getByRole('textbox', { name: /Features/i })).toHaveValue('Priority booking\nEarly access');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('refuses a blank name and a key that is not a slug, and sends nothing', async () => {
    const { props } = mount();
    fireEvent.change(field(/^Key/), { target: { value: 'Not A Slug!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(
      screen.getByText('Key may contain lowercase letters, digits, dashes and underscores'),
    ).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('submits the typed plan, dropping blank feature lines', async () => {
    const { props } = mount();
    fireEvent.change(field(/^Key/), { target: { value: 'gold' } });
    fireEvent.change(field(/Display name/i), { target: { value: 'Gold' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Features/i }), {
      target: { value: 'One\n\n  \nTwo' },
    });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Coming soon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'gold',
        name: 'Gold',
        features: ['One', 'Two'],
        sort_order: 5,
        is_coming_soon: true,
        is_active: true,
      }),
    );
  });

  it('saves an edited plan with its locked key intact', async () => {
    const { props } = mount({ editing: EDITING });
    fireEvent.change(field(/Display name/i), { target: { value: 'Premium Plus' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Active' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'premium', name: 'Premium Plus', is_active: false }),
    );
  });

  it('closes from Cancel', () => {
    const { props } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('clears what was typed once the dialog closes, so the next plan starts blank', () => {
    const { rerender, props } = mount();
    fireEvent.change(field(/Display name/i), { target: { value: 'Leftover' } });

    rerender(<PodPlanFormDialog {...props} open={false} />);
    rerender(<PodPlanFormDialog {...props} open />);

    expect(field(/Display name/i)).toHaveValue('');
  });

  it('shows the busy state on the submit button', () => {
    mount({ loading: true });
    expect(screen.getByRole('button', { name: /Create plan/ })).toBeDisabled();
  });
});
