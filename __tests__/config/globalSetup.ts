import { MongoMemoryServer } from "mongodb-memory-server";

export = async function globalSetup() {
  // setup our memory server for testing
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  (global as any).__MONGOINSTANCE = instance;
  process.env.MONGO_TESTING_URI = uri;

};
