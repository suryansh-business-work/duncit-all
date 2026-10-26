import { UserModel } from '../../user.model';

/**
 * Role writes (user.roles) run inside `session.withTransaction`, which a
 * standalone mongod — the suites' mongodb-memory-server — cannot host: every
 * write is refused with "Transaction numbers are only allowed on a replica set
 * member or mongos". This keeps each session real and makes its transaction
 * wrapper simply run the work, so every write still carries the session.
 *
 * Install once per suite (`beforeAll`) and restore with the returned spy's
 * `mockRestore()` (`afterAll`); installing it twice would wrap the stub in itself.
 */
export function sessionsWithoutTransactions(): jest.SpyInstance {
  const realStart = UserModel.db.startSession.bind(UserModel.db);
  return jest.spyOn(UserModel.db, 'startSession').mockImplementation((async (opts?: any) => {
    const session = await realStart(opts);
    (session as any).withTransaction = async (fn: (s: unknown) => Promise<unknown>) => {
      await fn(session);
    };
    return session;
  }) as any);
}
