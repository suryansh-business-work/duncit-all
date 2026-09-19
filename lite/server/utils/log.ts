/**
 * Structured logging for the Lite server: one JSON line per record on stdout,
 * which Docker collects. The shape mirrors the main server's
 * `logs.server.<level>(page, component, context)` so a reader of either log
 * sees the same fields.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

function serializeError(error: unknown): SerializedError | undefined {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (error === undefined || error === null) return undefined;
  return { name: 'Error', message: typeof error === 'string' ? error : JSON.stringify(error) };
}

function emit(level: Level, page: string, component: string, context: Record<string, unknown>): void {
  const { error, ...rest } = context;
  const record = {
    ts: new Date().toISOString(),
    level,
    app: 'lite-server',
    page,
    component,
    ...rest,
    ...(error === undefined ? {} : { error: serializeError(error) }),
  };
  const line = `${JSON.stringify(record)}\n`;
  if (level === 'error' || level === 'warn') process.stderr.write(line);
  else process.stdout.write(line);
}

export const log = {
  debug: (page: string, component: string, context: Record<string, unknown> = {}) => emit('debug', page, component, context),
  info: (page: string, component: string, context: Record<string, unknown> = {}) => emit('info', page, component, context),
  warn: (page: string, component: string, context: Record<string, unknown> = {}) => emit('warn', page, component, context),
  error: (page: string, component: string, context: Record<string, unknown> = {}) => emit('error', page, component, context),
};
