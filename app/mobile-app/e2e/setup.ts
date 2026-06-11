import { beforeAll } from '@jest/globals';
import { device } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { location: 'inuse' },
  });
});
