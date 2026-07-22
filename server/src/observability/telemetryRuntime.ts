/**
 * Lightweight runtime bridge between the synchronous log funnel (log.ts) and the
 * DB-backed telemetry module. Holds no Mongoose deps, so log.ts can import it at
 * the very top of the process without an import cycle.
 *
 * - `signozEnabled` / `shouldPersist` are read synchronously by `emitStructured`.
 * - `persist` fans a record out to the handler the telemetry service registers
 *   at boot (after connectDB); it is a no-op until then, and never throws.
 *
 * The telemetry service is the single writer of the config + handler.
 */
type PersistHandler = (record: unknown) => void;

let signozEnabled = true;
let persistLevels: Set<string> = new Set(['error', 'warn']);
let persistHandler: PersistHandler | undefined;

export const telemetryRuntime = {
  get signozEnabled(): boolean {
    return signozEnabled;
  },
  shouldPersist(level: string): boolean {
    return !!persistHandler && persistLevels.has(level);
  },
  persist(record: unknown): void {
    try {
      persistHandler?.(record);
    } catch {
      /* persistence must never break logging */
    }
  },
  configure(opts: { signozEnabled: boolean; persistLevels: readonly string[] }): void {
    signozEnabled = opts.signozEnabled;
    persistLevels = new Set(opts.persistLevels);
  },
  registerPersistHandler(fn: PersistHandler): void {
    persistHandler = fn;
  },
};
