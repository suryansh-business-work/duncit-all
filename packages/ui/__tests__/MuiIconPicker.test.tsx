import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import PetsIcon from '@mui/icons-material/Pets';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import SpaIcon from '@mui/icons-material/Spa';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import { searchMuiIconNames } from '../src/mui-icon/muiIcons';
import type { MuiIconPickerProps } from '../src/mui-icon/MuiIconPicker';

/** A stand-in for the ~10.7k-export package; loading the real one inside jsdom takes seconds. */
const ICONS = { Pets: PetsIcon, PetsOutlined: PetsOutlinedIcon, Spa: SpaIcon, SportsSoccer: SportsSoccerIcon };
const LOAD_FAILED = 'The icon list could not load. You can still type an icon name.';

/** Holds the icon chunk "in flight" until the test opens it. */
function gate() {
  const handle: { open: () => void } = { open: () => undefined };
  const opened = new Promise<void>((resolve) => {
    handle.open = resolve;
  });
  return { opened, open: () => handle.open() };
}

/** The set is cached in module state, so each test loads a fresh copy against its own stand-in. */
async function fresh(factory: () => unknown = () => ICONS) {
  vi.resetModules();
  vi.doMock('@mui/icons-material', factory);
  const lib = await import('../src/mui-icon/muiIcons');
  const hook = await import('../src/mui-icon/useMuiIcons');
  const picker = await import('../src/mui-icon/MuiIconPicker');
  return { ...lib, ...hook, ...picker };
}

/** Owns the value the way a form does, and records every write. */
async function renderPicker(props: Partial<MuiIconPickerProps> = {}, factory?: () => unknown) {
  const { MuiIconPicker } = await fresh(factory);
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(props.value ?? '');
    return (
      <MuiIconPicker
        label="Icon"
        {...props}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }
  render(<Harness />);
  return { onChange, input: screen.getByRole('combobox') };
}

// The first fresh() transforms the picker's whole @mui/material graph, and in a coverage run instruments it,
// which takes longer than one test's 5 s on a CI runner. Pay it once here: after resetModules every fresh()
// re-runs the modules but reuses the transformed code. The icon set itself stays mocked per test.
beforeAll(async () => {
  await import('../src/mui-icon/MuiIconPicker');
}, 60_000);

afterEach(() => {
  vi.doUnmock('@mui/icons-material');
  vi.resetModules();
});

describe('searchMuiIconNames', () => {
  const NAMES = ['AddHome', 'Home', 'HomeOutlined', 'HomeWork', 'MusicNote', 'MusicNoteOutlined', 'Spa'];

  it('puts the exact name first, then names starting with the search, then names containing it', () => {
    expect(searchMuiIconNames(NAMES, 'home', 10)).toEqual(['Home', 'HomeOutlined', 'HomeWork', 'AddHome']);
  });

  it('ignores case and spaces, so a name can be typed as words', () => {
    expect(searchMuiIconNames(NAMES, 'Music Note', 10)).toEqual(['MusicNote', 'MusicNoteOutlined']);
  });

  it('lists from the top when nothing (or only spaces) is typed, never past the limit', () => {
    expect(searchMuiIconNames(NAMES, '', 3)).toEqual(['AddHome', 'Home', 'HomeOutlined']);
    expect(searchMuiIconNames(NAMES, '  ', 2)).toEqual(['AddHome', 'Home']);
    expect(searchMuiIconNames(NAMES, 'o', 2)).toEqual(['AddHome', 'Home']);
  });

  it('finds nothing for text no icon name contains', () => {
    expect(searchMuiIconNames(NAMES, 'zebra', 10)).toEqual([]);
  });
});

describe('loadMuiIcons', () => {
  it('downloads the set once and shares it with every caller', async () => {
    const factory = vi.fn(() => ICONS);
    const { loadMuiIcons, loadedMuiIcons } = await fresh(factory);
    expect(loadedMuiIcons()).toBeNull();

    const first = loadMuiIcons();
    expect(loadMuiIcons()).toBe(first);
    const set = await first;

    expect(set.Pets).toBe(PetsIcon);
    expect(loadedMuiIcons()).toBe(set);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('starts a new download after a failed one instead of replaying the failure', async () => {
    const { loadMuiIcons, loadedMuiIcons } = await fresh(() => {
      throw new Error('chunk failed');
    });
    const first = loadMuiIcons();
    await expect(first).rejects.toThrow();
    expect(loadedMuiIcons()).toBeNull();

    const retry = loadMuiIcons();
    expect(retry).not.toBe(first);
    await retry.catch(() => undefined);
  });
});

describe('useMuiIcons', () => {
  it('is empty while loading, then lists every name and finds icons by their exact export name', async () => {
    const { useMuiIcons } = await fresh();
    const { result } = renderHook(() => useMuiIcons());
    expect(result.current).toMatchObject({ names: [], loading: true, failed: false });
    expect(result.current.find('Pets')).toBeUndefined();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.names).toEqual(['Pets', 'PetsOutlined', 'Spa', 'SportsSoccer']);
    expect(result.current.find('Pets')).toBe(PetsIcon);
    expect(result.current.find('pets')).toBeUndefined();
    expect(result.current.find('constructor')).toBeUndefined();
  });

  it('draws at once on a later mount, from the set already downloaded', async () => {
    const { useMuiIcons, loadMuiIcons } = await fresh();
    await loadMuiIcons();
    const { result } = renderHook(() => useMuiIcons());
    expect(result.current.loading).toBe(false);
    expect(result.current.find('Spa')).toBe(SpaIcon);
  });

  it('loads once and lands once while the host re-renders with a new callback mid-download', async () => {
    const chunk = gate();
    const factory = vi.fn(async () => {
      await chunk.opened;
      return ICONS;
    });
    const { useMuiIcons } = await fresh(factory);
    const { result, rerender } = renderHook(({ onError }) => useMuiIcons(onError), {
      initialProps: { onError: vi.fn() },
    });
    rerender({ onError: vi.fn() });

    await act(async () => chunk.open());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.find('SportsSoccer')).toBe(SportsSoccerIcon);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('reports a failed download once, to the newest callback, and stops loading', async () => {
    const chunk = gate();
    const { useMuiIcons } = await fresh(async () => {
      await chunk.opened;
      throw new Error('chunk failed');
    });
    const stale = vi.fn();
    const current = vi.fn();
    const { result, rerender } = renderHook(({ onError }) => useMuiIcons(onError), {
      initialProps: { onError: stale },
    });
    rerender({ onError: current });

    await act(async () => chunk.open());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(current).toHaveBeenCalledTimes(1);
    expect(stale).not.toHaveBeenCalled();
  });

  it('still marks the failure for a host that passes no callback', async () => {
    const { useMuiIcons } = await fresh(() => {
      throw new Error('chunk failed');
    });
    const { result } = renderHook(() => useMuiIcons());
    await waitFor(() => expect(result.current.failed).toBe(true));
  });
});

describe('MuiIconPicker', () => {
  it('shows the list on focus, saying it is loading until the icons arrive', async () => {
    const chunk = gate();
    const { input } = await renderPicker({}, async () => {
      await chunk.opened;
      return ICONS;
    });
    act(() => input.focus());
    expect(screen.getByText('Loading icons…')).toBeInTheDocument();

    await act(async () => chunk.open());
    expect(await screen.findAllByRole('option')).toHaveLength(4);
  });

  it('searches the list, previews each row and stores the icon picked', async () => {
    const { onChange, input } = await renderPicker({ helperText: 'Pick one' });
    fireEvent.change(input, { target: { value: 'pets' } });
    expect(onChange).toHaveBeenLastCalledWith('pets');

    const option = await screen.findByRole('option', { name: 'Pets' });
    expect(within(option).getByTestId('PetsIcon')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PetsOutlined' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Spa' })).toBeNull();

    fireEvent.click(option);
    expect(onChange).toHaveBeenLastCalledWith('Pets');
    expect(screen.getByText('Material icon: Pets')).toBeInTheDocument();
    const field = input.closest<HTMLElement>('.MuiInputBase-root');
    expect(field && within(field).getByTestId('PetsIcon')).toBeInTheDocument();
  });

  it('writes an empty string when cleared', async () => {
    const { onChange } = await renderPicker({ value: 'Spa' });
    // The clear button is CSS-hidden until hover, so jsdom gives it no name; its title still names it.
    fireEvent.click(screen.getByTitle('Clear'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('shows a pasted emoji in front of the input, but not a half-typed name', async () => {
    const { input } = await renderPicker({ value: '🎉', helperText: 'Pick one' });
    const field = input.closest('.MuiInputBase-root');
    expect(field).toHaveTextContent('🎉');
    expect(screen.getByText('Pick one')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Spo' } });
    expect(field).not.toHaveTextContent('Spo');
  });

  it('shows the caller message, not the icon name, while the field is invalid', async () => {
    const { input } = await renderPicker({ value: 'Pets', error: true, helperText: 'Use an icon name' });
    await screen.findByTestId('PetsIcon');
    expect(screen.getByText('Use an icon name')).toBeInTheDocument();
    expect(screen.queryByText('Material icon: Pets')).toBeNull();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('says when the list cannot load, reports why, and still takes a typed name', async () => {
    const onLoadError = vi.fn();
    const { onChange, input } = await renderPicker({ onLoadError, helperText: 'Pick one' }, () => {
      throw new Error('chunk failed');
    });
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();
    expect(onLoadError).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: 'Pets' } });
    expect(onChange).toHaveBeenLastCalledWith('Pets');
  });

  it('puts the test id on the input and reports a blur', async () => {
    const onBlur = vi.fn();
    await renderPicker({ testId: 'category-icon', onBlur });
    const input = screen.getByTestId('category-icon');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
  });

  it('locks the input while disabled', async () => {
    await renderPicker({ testId: 'category-icon', disabled: true });
    expect(screen.getByTestId('category-icon')).toBeDisabled();
  });
});
