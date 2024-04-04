import { config as dotenvConfig } from "dotenv";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

dotenvConfig();

const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
const NODE_ENV = process.env.NODE_ENV;

if (
  !NODE_ENV ||
  !FIREBASE_STORAGE_BUCKET ||
  !FIREBASE_PROJECT_ID ||
  !FIREBASE_CLIENT_EMAIL ||
  !FIREBASE_PRIVATE_KEY
) {
  throw new Error("Missing firebase config settings");
}

if (NODE_ENV === "test") {
  process.env["FIREBASE_STORAGE_EMULATOR_HOST"] = "127.0.0.1:9199";
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
  storageBucket: FIREBASE_STORAGE_BUCKET,
});

export default app;
export const storageBucket = getStorage(app).bucket();
