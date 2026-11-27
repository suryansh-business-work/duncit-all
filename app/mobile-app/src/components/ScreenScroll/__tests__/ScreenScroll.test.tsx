import { createRef, type ReactNode } from 'react';
import type { ScrollView as RNScrollView } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { RefreshScrollView } from '@/components/PullToRefresh';
import {
  ScreenScrollProvider,
  ScrollTopOnTabEntry,
  useScreenScroll,
  useScrollTopOnChange,
} from '@/components/ScreenScroll';
import { renderWithProviders } from '@/utils/test-utils';

type TabState = { index: number; routes: { key: string }[] };
type StateListener = (e: { data: { state: TabState } }) => void;

const tabRoutes = [{ key: 'home-1' }, { key: 'clubs-2' }];
let mockTabState: TabState = { index: 0, routes: tabRoutes };
let mockListeners: StateListener[] = [];

// ScrollTopOnTabEntry reads the tab's own navigation (tabScreenLayout mounts it
// inside the tab's context); here that is a tab navigator the test moves.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    getState: () => mockTabState,
    addListener: (_type: 'state', cb: StateListener) => {
      mockListeners.push(cb);
      return () => {
        mockListeners = mockListeners.filter((l) => l !== cb);
      };
    },
  }),
  useRoute: () => ({ key: 'clubs-2', name: 'Clubs' }),
}));

type ScreenScroll = NonNullable<ReturnType<typeof useScreenScroll>>;

/** Hands the screen's registry to the test. */
function Probe({ onScroll }: Readonly<{ onScroll: (s: ScreenScroll | null) => void }>) {
  onScroll(useScreenScroll());
  return null;
}

function renderScreen(children: ReactNode) {
  const seen: { current: ScreenScroll | null } = { current: null };
  const utils = renderWithProviders(
    <ScreenScrollProvider>
      <Probe
        onScroll={(s) => {
          seen.current = s;
        }}
      />
      {children}
    </ScreenScrollProvider>,
  );
  const screenScroll = seen.current;
  if (!screenScroll) throw new Error('the screen registry did not render');
  return { ...utils, screenScroll };
}

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <ScreenScrollProvider>{children}</ScreenScrollProvider>
);

describe('ScreenScrollProvider', () => {
  it('scrolls every registered view to the top, and stops once one is removed', () => {
    const { screenScroll } = renderScreen(null);
    const list = { scrollToOffset: jest.fn() };
    const page = { scrollTo: jest.fn() };
    screenScroll.register(list);
    const removePage = screenScroll.register(page);

    screenScroll.scrollToTop();
    expect(list.scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: false });
    expect(page.scrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });

    removePage();
    screenScroll.scrollToTop();
    expect(page.scrollTo).toHaveBeenCalledTimes(1);
    expect(list.scrollToOffset).toHaveBeenCalledTimes(2);
  });

  it('is null outside a screen', () => {
    const { result } = renderHook(() => useScreenScroll());
    expect(result.current).toBeNull();
  });
});

describe('RefreshScrollView in a screen', () => {
  it('registers a vertical scroll view and still hands the caller its ref', () => {
    const ref = createRef<RNScrollView>();
    const { screenScroll } = renderScreen(
      <RefreshScrollView ref={ref}>
        <Text>Row</Text>
      </RefreshScrollView>,
    );
    expect(ref.current).not.toBeNull();
    const scrollTo = jest
      .spyOn(ref.current as RNScrollView, 'scrollTo')
      .mockImplementation(() => undefined);

    screenScroll.scrollToTop();
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });
  });

  it('leaves a horizontal rail alone — it is not the page', () => {
    const ref = createRef<RNScrollView>();
    const { screenScroll } = renderScreen(
      <RefreshScrollView ref={ref} horizontal>
        <Text>Card</Text>
      </RefreshScrollView>,
    );
    const scrollTo = jest
      .spyOn(ref.current as RNScrollView, 'scrollTo')
      .mockImplementation(() => undefined);

    screenScroll.scrollToTop();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('drops out of the registry when it unmounts', () => {
    const ref = createRef<RNScrollView>();
    const { screenScroll, rerender } = renderScreen(<RefreshScrollView ref={ref} />);
    const scrollTo = jest
      .spyOn(ref.current as RNScrollView, 'scrollTo')
      .mockImplementation(() => undefined);

    rerender(
      <ScreenScrollProvider>
        <Text>Empty</Text>
      </ScreenScrollProvider>,
    );
    screenScroll.scrollToTop();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('useScrollTopOnChange', () => {
  function renderStepper() {
    const view = { scrollTo: jest.fn() };
    const hook = renderHook(
      ({ step }: { step: number }) => {
        const screenScroll = useScreenScroll();
        screenScroll?.register(view);
        useScrollTopOnChange(step);
      },
      { initialProps: { step: 0 }, wrapper },
    );
    return { view, ...hook };
  }

  it('does not move the page on the first render', () => {
    const { view } = renderStepper();
    expect(view.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top when the step changes, and not when it stays', () => {
    const { view, rerender } = renderStepper();
    rerender({ step: 1 });
    expect(view.scrollTo).toHaveBeenCalledTimes(1);
    rerender({ step: 1 });
    expect(view.scrollTo).toHaveBeenCalledTimes(1);
    rerender({ step: 0 });
    expect(view.scrollTo).toHaveBeenCalledTimes(2);
  });
});

describe('ScrollTopOnTabEntry', () => {
  const moveTo = (index: number) =>
    act(() => {
      mockTabState = { index, routes: tabRoutes };
      for (const l of mockListeners) l({ data: { state: mockTabState } });
    });

  function renderTab(initialIndex: number) {
    mockTabState = { index: initialIndex, routes: tabRoutes };
    mockListeners = [];
    const view = { scrollTo: jest.fn() };
    const utils = renderScreen(<ScrollTopOnTabEntry />);
    utils.screenScroll.register(view);
    return { ...utils, view };
  }

  it('opens the tab at the top when the user switches to it', () => {
    const { view } = renderTab(0);
    moveTo(1);
    expect(view.scrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });
  });

  it('keeps its place when another tab opens or the same tab stays (Back from a pushed screen)', () => {
    const { view } = renderTab(1);
    moveTo(1);
    moveTo(0);
    expect(view.scrollTo).not.toHaveBeenCalled();
    moveTo(1);
    expect(view.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('stops listening when the tab unmounts', () => {
    const { unmount } = renderTab(0);
    expect(mockListeners).toHaveLength(1);
    unmount();
    expect(mockListeners).toHaveLength(0);
  });
});
