import { useFormContext } from 'react-hook-form';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RhfTextField } from '@duncit/forms';
import { SectionDialog } from '../../../../pages/event-form/luma/SectionDialog';
import type { EventFormValues } from '../../../../pages/event-form/event.types';
import { renderInEventForm } from '../helpers';

function CapacityBox() {
  const { control } = useFormContext<EventFormValues>();
  return <RhfTextField control={control} name="capacity" label="Capacity" />;
}

function renderDialog(onClose: () => void, capacity = '') {
  return renderInEventForm(
    <SectionDialog open onClose={onClose} title="Capacity" fields={['capacity']} testId="capacity-dialog">
      <CapacityBox />
    </SectionDialog>,
    { defaults: { capacity, title: '' } },
  );
}

describe('SectionDialog', () => {
  it('is a dialog named by its title', () => {
    renderDialog(vi.fn());
    expect(screen.getByRole('dialog', { name: 'Capacity' })).toBeInTheDocument();
  });

  it('stays open and shows the problem when Done finds its field wrong', async () => {
    const onClose = vi.fn();
    const { user } = renderDialog(onClose, '0');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('Enter 1 or more')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Done when its own fields are right, even if another part of the form is not', async () => {
    const onClose = vi.fn();
    const { user } = renderDialog(onClose, '25');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('This is required')).not.toBeInTheDocument();
  });

  it('closes on Escape without checking, so the host can back out', async () => {
    const onClose = vi.fn();
    const { user } = renderDialog(onClose, '-4');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('This cannot be negative')).not.toBeInTheDocument();
  });
});
