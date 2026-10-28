import { afterAll, beforeAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { settingsService } from '../../services/settings.service';

/**
 * One in-memory MongoDB per test file. Every collection is emptied before each
 * test (indexes are kept, so unique and partial indexes still apply) and the
 * settings row is re-seeded, which also drops the settings service's cache.
 */
export function withTestDatabase(): void {
  let server: MongoMemoryServer | undefined;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri(), { dbName: 'lite-test' });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
    await settingsService.seed();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
  });
}
