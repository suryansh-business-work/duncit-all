import { act, renderHook } from '@testing-library/react-native';

import { useScrollTopOnTabEntry } from '../useScrollTopOnTabEntry';

type State = { index: number; routes: { key: string }[] };
type Listener = (event: { data: { state: State } }) => void;

const routes = [{ key: 'home-1' }, { key: 'leads-2' }, { key: 'more-3' }];
let tabState: State = { index: 0, routes };
let listeners: Listener[] = [];

const mockNavigation = {
  getState: () => tabState,
  addListener: (_type: 'state', listener: Listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ key: 'leads-2' }),
}));

/** The tab navigator moving to tab `index`. */
const moveTo = (index: number) =>
  act(() => {
    tabState = { index, routes };
    for (const l of listeners) l({ data: { state: tabState } });
  });

function renderLeadsTab(initialIndex: number) {
  tabState = { index: initialIndex, routes };
  const list = { scrollToOffset: jest.fn() };
  const hook = renderHook(() => useScrollTopOnTabEntry<typeof list>());
  (hook.result.current as { current: typeof list | null }).current = list;
  return { list, ...hook };
}

beforeEach(() => {
  listeners = [];
});

describe('useScrollTopOnTabEntry', () => {
  it('puts the list back at the top, without animating, when the user switches to the tab', () => {
    const { list } = renderLeadsTab(0);
    moveTo(1);
    expect(list.scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: false });
  });

  it('keeps the place when the tab stays put (Back from a lead) or another tab opens', () => {
    const { list } = renderLeadsTab(1);
    moveTo(1);
    moveTo(2);
    expect(list.scrollToOffset).not.toHaveBeenCalled();
    moveTo(1);
    expect(list.scrollToOffset).toHaveBeenCalledTimes(1);
  });

  it('does nothing before the list has mounted', () => {
    const hook = renderHook(() => useScrollTopOnTabEntry());
    expect(hook.result.current.current).toBeNull();
    expect(() => moveTo(1)).not.toThrow();
  });

  it('stops listening once the tab unmounts', () => {
    const { unmount } = renderLeadsTab(0);
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
