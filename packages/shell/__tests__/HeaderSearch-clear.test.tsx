/**
 * The Autocomplete's own `value` is permanently `null` here — this is a
 * search-as-you-type box, not a value-holding select — so MUI never renders a
 * clear affordance a person could press. `onChange` can still fire with a
 * null option through the API contract itself; the guard is exercised by
 * invoking it directly, the way no real gesture in this configuration can.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

let capturedOnChange: ((event: unknown, option: { to: string } | null) => void) | undefined;

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return {
    ...actual,
    Autocomplete: (props: {
      onChange: (event: unknown, option: { to: string } | null) => void;
    }): ReactElement | null => {
      capturedOnChange = props.onChange;
      return null;
    },
  };
});

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

import { HeaderSearch } from '../src/chrome/HeaderSearch';

describe('HeaderSearch onChange with no option', () => {
  it('navigates nowhere when the callback carries no option at all', () => {
    render(<HeaderSearch nav={[{ label: 'Home', to: '/' }]} />);

    expect(() => capturedOnChange?.({}, null)).not.toThrow();
    expect(navigate).not.toHaveBeenCalled();
  });
});
