import { MongoMemoryServer } from 'mongodb-memory-server';

import cookieControl from './session';

export = async function globalTeardown() {
  const instance: MongoMemoryServer = (global as any).__MONGOINSTANCE;
  await instance.stop();
  cookieControl.setCookie("");
};
