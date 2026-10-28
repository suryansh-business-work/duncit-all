import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhenBox } from '../../../../pages/event-form/luma/WhenBox';
import { renderInEventForm } from '../helpers';

describe('WhenBox', () => {
  it('is a region named When with a start, an end and the zone', () => {
    renderInEventForm(<WhenBox />);
    const region = screen.getByRole('region', { name: 'When' });
    expect(region).toHaveTextContent('Starts');
    expect(region).toHaveTextContent('Ends');
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('Asia/Kolkata');
    expect(screen.getByText('The zone the times above are in')).toBeInTheDocument();
  });

  it('offers the saved zone even when the browser lists it under another name', async () => {
    // V8 lists India as Asia/Calcutta; the form opens on Asia/Kolkata, which must still be a choice.
    const { user } = renderInEventForm(<WhenBox />);
    const zone = screen.getByRole('combobox', { name: 'Time zone' });
    await user.clear(zone);
    await user.type(zone, 'Asia/Kol');
    expect(screen.getByRole('option', { name: 'Asia/Kolkata' })).toBeInTheDocument();
  });

  it('moves the event to another zone', async () => {
    const { user, form } = renderInEventForm(<WhenBox />);
    const zone = screen.getByRole('combobox', { name: 'Time zone' });
    await user.clear(zone);
    await user.type(zone, 'Asia/Tok');
    await user.click(screen.getByRole('option', { name: 'Asia/Tokyo' }));
    expect(form().getValues('timezone')).toBe('Asia/Tokyo');
    expect(zone).toHaveValue('Asia/Tokyo');
  });

  it('shows the end-before-start problem under the end', async () => {
    const { form } = renderInEventForm(<WhenBox />, {
      defaults: { start_at: new Date('2026-12-05T16:00:00.000Z'), end_at: new Date('2026-12-05T13:30:00.000Z') },
    });
    await act(async () => {
      await form().trigger();
    });
    expect(screen.getByText('The event must end after it starts')).toBeInTheDocument();
  });
});
