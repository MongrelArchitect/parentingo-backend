import { config as dotenvConfig } from "dotenv";
import session from "express-session";
const MongoDBStore = require("connect-mongodb-session")(session);

dotenvConfig();
const MONGO = process.env.MONGO; 
const TESTING = process.env.MONGO_TESTING_URI;

const store = new MongoDBStore({
  uri: TESTING ? TESTING : MONGO,
  databaseName: "parentingo",
  collection: "sessions",
});

export default store;
