import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Whether the app is in front now, following it as it comes and goes. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
