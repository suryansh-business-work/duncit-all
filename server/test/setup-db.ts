import mongoose from 'mongoose';

// Connects to the shared in-memory MongoDB started in global-setup. Collections
// are wiped after every test (isolation + "delete any data created by tests").
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI as string);
  }
}, 60_000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
