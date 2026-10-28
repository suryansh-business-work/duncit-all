import { MongoBinary } from 'mongodb-memory-server';

/**
 * Vitest global setup for the server project: fetch the MongoDB binary once,
 * before any test file starts. Each file boots its own in-memory server
 * (helpers/mongo.ts); on a runner with a cold cache, the files that start
 * together all raced to download the same binary, fought over its lock file
 * and timed out their hooks.
 */
export default async function downloadMongoBinary(): Promise<void> {
  await MongoBinary.getPath();
}
