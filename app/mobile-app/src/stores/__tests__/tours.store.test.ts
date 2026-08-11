import { getItem, setItem } from '@/services/secure-storage';
import { useToursStore } from '@/stores/tours.store';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

const reset = () =>
  useToursStore.setState({
    completed: [],
    activeTourId: null,
    activeSteps: [],
    mountedAnchors: [],
  });

beforeEach(() => {
  jest.clearAllMocks();
  reset();
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
});

describe('tours store', () => {
  it('hydrates this user’s completions from the secure store', async () => {
    mockGet.mockResolvedValue(JSON.stringify(['home', 'club']));
    await useToursStore.getState().hydrate('u1');
    expect(mockGet).toHaveBeenCalledWith('duncit.tours.completed.u1');
    expect(useToursStore.getState().completed).toEqual(['home', 'club']);
  });

  it('treats an unreadable store as nothing completed rather than throwing', async () => {
    mockGet.mockRejectedValue(new Error('keystore locked'));
    await useToursStore.getState().hydrate('u1');
    expect(useToursStore.getState().completed).toEqual([]);
  });

  it('starts a tour', () => {
    useToursStore.getState().startTour('club');
    expect(useToursStore.getState().activeTourId).toBe('club');
  });

  it('starting clears the previous tour’s locked step list', () => {
    useToursStore.getState().armTour([{ anchor: 'home-pods', title: 'T', body: 'B' }]);
    useToursStore.getState().startTour('club');
    expect(useToursStore.getState().activeSteps).toEqual([]);
  });

  it('locks a copy of the resolved steps in, so the caller cannot mutate them', () => {
    const resolved = [{ anchor: 'home-pods', title: 'T', body: 'B' }];
    useToursStore.getState().armTour(resolved);
    expect(useToursStore.getState().activeSteps).toEqual(resolved);
    expect(useToursStore.getState().activeSteps).not.toBe(resolved);
  });

  it('tracks which anchors are on screen, without duplicating one', () => {
    const { registerAnchor, unregisterAnchor } = useToursStore.getState();
    registerAnchor('home-pods');
    registerAnchor('home-pods');
    registerAnchor('home-clubs');
    expect(useToursStore.getState().mountedAnchors).toEqual(['home-pods', 'home-clubs']);
    unregisterAnchor('home-pods');
    expect(useToursStore.getState().mountedAnchors).toEqual(['home-clubs']);
  });

  it('finishing records the tour, clears it and persists under the user key', async () => {
    useToursStore.getState().startTour('home');
    await useToursStore.getState().finishTour('u1', 'home');
    expect(useToursStore.getState().activeTourId).toBeNull();
    expect(useToursStore.getState().completed).toEqual(['home']);
    expect(mockSet).toHaveBeenCalledWith('duncit.tours.completed.u1', JSON.stringify(['home']));
  });

  it('keeps the tour marked complete even when the write fails', async () => {
    mockSet.mockRejectedValue(new Error('disk full'));
    await useToursStore.getState().finishTour('u1', 'home');
    expect(useToursStore.getState().completed).toEqual(['home']);
  });

  it('auto-starts Home only for a first signup that has never seen it', () => {
    useToursStore.getState().maybeAutoStartHomeTour(true);
    expect(useToursStore.getState().activeTourId).toBe('home');
  });

  it('does not auto-start for a returning user', () => {
    useToursStore.getState().maybeAutoStartHomeTour(false);
    expect(useToursStore.getState().activeTourId).toBeNull();
  });

  it('does not auto-start once Home has been completed or skipped', async () => {
    await useToursStore.getState().finishTour('u1', 'home');
    useToursStore.getState().maybeAutoStartHomeTour(true);
    expect(useToursStore.getState().activeTourId).toBeNull();
  });
});
