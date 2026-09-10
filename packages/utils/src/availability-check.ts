/**
 * Ask the server about a value once the typing stops — the half every
 * debounced "is this free?" box shares.
 *
 * The @handle field on Edit profile and the two boxes on signup's contact step
 * ask different questions and read the answer differently, but the round trip
 * between them is one thing (rule 34): wait for the typing to stop, drop a
 * reply for a value no longer in the box, and never render a failed ask as an
 * answer. Each field keeps its own shape guard and its own reading of the
 * answer; this file owns nothing but the trip.
 *
 * It returns the cleanup, which is exactly a React effect's contract, so a hook
 * on either surface supplies only its transport and its logger.
 */

/** Long enough that typing a whole value costs one request, short enough that
 * the answer arrives before the reader's finger leaves the key. */
export const AVAILABILITY_CHECK_DEBOUNCE_MS = 400;

/** What a box knows about the value currently in it. */
export interface AvailabilityCheckState<TAnswer> {
  /** A debounced ask is in flight. */
  checking: boolean;
  /** The answer for the CURRENT candidate, or null while there is not one. */
  answer: TAnswer | null;
  /**
   * The ask could not be made — a network blink, a refused request. Still no
   * answer, but not "still waiting": each field decides whether that blocks.
   */
  failed: boolean;
}

/** No answer yet, and nothing asked. */
export function idleAvailabilityCheck<TAnswer>(): AvailabilityCheckState<TAnswer> {
  return { checking: false, answer: null, failed: false };
}

export interface AvailabilityCheckOptions<TAnswer> {
  /**
   * The value to ask about, already normalised — or null when its shape rules
   * it out on the device, which resets the box to idle without a request.
   */
  candidate: string | null;
  /** Asks the server. Apollo on mWeb, `graphqlRequest` on native. */
  ask: (candidate: string) => Promise<TAnswer>;
  onState: (state: AvailabilityCheckState<TAnswer>) => void;
  /** Reported, never rendered. */
  onError: (error: unknown, candidate: string) => void;
}

/**
 * Three things make this correct rather than merely debounced:
 *  - a null candidate never leaves the device: its shape was decided by the
 *    caller, so a request for it would be a round trip whose answer was known;
 *  - the cleanup closes over THIS invocation, so a reply for a value no longer
 *    in the box is dropped. Without that, a slow "taken" for `rav` lands after
 *    a fast "available" for `ravi` and the box reports the wrong one;
 *  - a failed ask is reported as failed, never as an answer. Telling somebody
 *    their address is taken because the network blinked would be worse than
 *    saying nothing.
 */
export function scheduleAvailabilityCheck<TAnswer>(
  options: Readonly<AvailabilityCheckOptions<TAnswer>>,
): () => void {
  const { candidate } = options;
  if (!candidate) {
    options.onState(idleAvailabilityCheck());
    return () => undefined;
  }

  let live = true;
  options.onState({ checking: true, answer: null, failed: false });
  const timer = setTimeout(() => {
    options.ask(candidate).then(
      (answer) => {
        if (!live) return;
        options.onState({ checking: false, answer, failed: false });
      },
      (error) => {
        if (!live) return;
        options.onError(error, candidate);
        options.onState({ checking: false, answer: null, failed: true });
      },
    );
  }, AVAILABILITY_CHECK_DEBOUNCE_MS);

  return () => {
    live = false;
    clearTimeout(timer);
  };
}
