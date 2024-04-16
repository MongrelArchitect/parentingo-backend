import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

// setup environemnt variables
dotenvConfig();
const NODE_ENV = process.env.NODE_ENV;
const MONGO = process.env.MONGO;
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;

const options: {user?: string, pass?: string} = {};

if (NODE_ENV === "production" && MONGO_USER && MONGO_PASS) {
  options.user = MONGO_USER;
  options.pass = MONGO_PASS;
}

// setup mongoose
mongoose.set("strictQuery", true);
export default async function connectMongoDB() {
  try {
    if (MONGO) {
      await mongoose.connect(MONGO, options);
      console.log("Connected to MongoDB");
    } else {
      throw new Error(
        "No mongoDB connection string - check environment variables",
      );
    }
  } catch (err) {
    // XXX
    // better way to handle this? there's already middleware that checks for
    // a connection & throws an error if there isn't one...
    console.error(err);
  }
}
