import { config as dotenvConfig } from "dotenv";
import session from "express-session";
const MongoDBStore = require("connect-mongodb-session")(session);

dotenvConfig();
const MONGO = process.env.MONGO;
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const TESTING = process.env.MONGO_TESTING_URI;

if (!MONGO || !MONGO_USER || !MONGO_PASS) {
  throw new Error(
    "Missing configs for MongoDB session store - check environment variables",
  );
}

const username = encodeURIComponent(MONGO_USER);
const password = encodeURIComponent(MONGO_PASS);

const mongoURL = `mongodb://${username}:${password}@${MONGO}`;

const store = new MongoDBStore({
  uri: TESTING ? TESTING : mongoURL,
  databaseName: "parentingo",
  collection: "sessions",
});

export default store;
