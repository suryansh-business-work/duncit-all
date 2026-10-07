import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { logs } from '@duncit/logs';

/** Whether the device asked for less motion — read once, then followed while the screen is open. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduce(enabled);
      })
      .catch((error: unknown) =>
        logs.mobileApp.error('useReduceMotion', 'isReduceMotionEnabled', { error }),
      );
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
