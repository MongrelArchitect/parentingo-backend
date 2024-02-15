import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

// setup environemnt variables
dotenvConfig();
const MONGO = process.env.MONGO;

// setup mongoose
mongoose.set("strictQuery", true);
export default async function connectMongoDB() {
  try {
    if (MONGO) {
      await mongoose.connect(MONGO);
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
