import { config as dotenvConfig } from "dotenv";
import fs from "fs";
import https from "https";
import path from "path";
import app from "app";
import connectMongoDB from "@configs/mongoose";

console.clear();

// setup environemnt variables
dotenvConfig();
const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;

// connect to database
connectMongoDB();

if (NODE_ENV === "development") {
  // we're using self signed certs just for local development purposes
  const options = {
    key: fs.readFileSync(
      `${path.resolve(__dirname, "../..")}/localhost-key.pem`,
    ),
    cert: fs.readFileSync(`${path.resolve(__dirname, "../..")}/localhost.pem`),
  };
  const server = https.createServer(options, app);
  // start em up!
  server.listen(PORT ? +PORT : 3000, () => {
    console.log(`Secure server listening on port ${PORT}`);
  });
} else {
  // start em up!
  app.listen(PORT ? +PORT : 3000, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
