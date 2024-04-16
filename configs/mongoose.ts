import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

// setup environemnt variables
dotenvConfig();
const MONGO = process.env.MONGO;
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;


// setup mongoose
mongoose.set("strictQuery", true);

export default async function connectMongoDB() {
  try {
    if (MONGO && MONGO_USER && MONGO_PASS) {
      const username = encodeURIComponent(MONGO_USER);
      const password = encodeURIComponent(MONGO_PASS);
      const mongoURL =`mongodb://${username}:${password}@${MONGO}`
      await mongoose.connect(mongoURL);
      console.log("Connected to MongoDB");
    } else {
      throw new Error(
        "Missing MongoDB configs for mongoose - check environment variables",
      );
    }
  } catch (err) {
    // XXX
    // better way to handle this? there's already middleware that checks for
    // a connection & throws an error if there isn't one...
    console.error(err);
  }
}
