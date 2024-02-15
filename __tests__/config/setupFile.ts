import mongoose from "mongoose";

beforeAll(async () => {
  // only if testing uri was successfully created in setup
  if (process.env.MONGO_TESTING_URI) {
    await mongoose.connect(process.env['MONGO_TESTING_URI']);
  }
});

afterAll(async () => {
  // only if testing uri was successfully created in setup
  if (process.env.MONGO_TESTING_URI) {
    await mongoose.disconnect();
  }
});
