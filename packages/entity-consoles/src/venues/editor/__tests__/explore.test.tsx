import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { renderWithProviders } from '../../../../__tests__/testkit';

const desktopPointer = (query: string): MediaQueryList => ({
  matches: query.includes('pointer: fine'),
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

describe('explore', () => {
  it('desktop typing', async () => {
    const spy = vi.spyOn(globalThis, 'matchMedia').mockImplementation((q) => {
      console.log('query', q);
      return desktopPointer(q);
    });
    const onChange = vi.fn((v: unknown) => console.log('change', String(v)));
    const user = userEvent.setup();
    renderWithProviders(<DatePicker label="Holiday" value={null} onChange={onChange} />);
    await user.click(screen.getByRole('spinbutton', { name: 'Day' }));
    console.log('dialog?', !!screen.queryByRole('dialog'));
    await user.keyboard('1');
    console.log('calls', onChange.mock.calls.length);
    await user.keyboard('5');
    console.log('calls', onChange.mock.calls.length);
    await user.keyboard('{ArrowUp}');
    console.log('calls', onChange.mock.calls.length);
    expect(spy).toHaveBeenCalled();
  });
});
