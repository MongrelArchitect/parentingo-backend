import { MongoMemoryServer } from 'mongodb-memory-server';

export = async function globalSetup() {
    const instance = await MongoMemoryServer.create();
    const uri = instance.getUri();
    (global as any).__MONGOINSTANCE = instance;
    process.env.MONGO_TESTING_URI = uri;
};
