import type { ComponentType } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- `react-internet-meter` ships no types. Asserted below.
import { ReactInternetSpeedMeter as Untyped } from 'react-internet-meter';

/**
 * The one place this untyped package is touched.
 *
 * An ambient `.d.ts` inside the shell does NOT solve this: a portal compiles
 * the shell's SOURCE through its own tsconfig, which never includes the
 * shell's `src/types`, so the shell would typecheck green while all seventeen
 * portal builds failed on the same import. A `@ts-expect-error` lives in the
 * source file itself and therefore travels with it.
 */
export interface InternetSpeedMeterProps {
  /** 'alert' | 'modal' | 'empty' — 'empty' renders nothing of its own. */
  outputType?: 'alert' | 'modal' | 'empty';
  txtMainHeading?: string;
  txtSubHeading?: string;
  customClassName?: string | null;
  /** Milliseconds between measurements. */
  pingInterval?: number;
  thresholdUnit?: 'byte' | 'kilobyte' | 'megabyte';
  threshold?: number;
  /** The file downloaded to time, and its exact size in BYTES as a string. */
  imageUrl?: string;
  downloadSize?: string;
  callbackFunctionOnNetworkDown?: (speed: number) => void;
  callbackFunctionOnNetworkTest?: (speed: number) => void;
}

export const ReactInternetSpeedMeter = Untyped as ComponentType<InternetSpeedMeterProps>;
