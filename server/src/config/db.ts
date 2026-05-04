import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  mongoose.set('strictQuery', true);

  const maxAttempts = 5;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30_000,
        socketTimeoutMS: 45_000,
        family: 4, // prefer IPv4 — avoids some Atlas SRV resolution issues on Windows
        retryWrites: true,
      });
      // eslint-disable-next-line no-console
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      lastErr = err;
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️  MongoDB connect attempt ${attempt}/${maxAttempts} failed: ${
          (err as Error).message
        }`
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
  }
  throw lastErr;
}
