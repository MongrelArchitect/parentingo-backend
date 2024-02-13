// package imports
import { config as dotenvConfig } from "dotenv";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";

// route imports
import usersRoutes from "@routes/users";

// setup environemnt variables
dotenvConfig();
const PORT = process.env.PORT ? +process.env.PORT : undefined;
const MONGO = process.env.MONGO ? process.env.MONGO : undefined;

// setup mongoose & connect to database
mongoose.set("strictQuery", true);
async function connectMongoDB() {
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
    console.error(err);
  }
}
connectMongoDB();

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// routes
app.use("/users", usersRoutes);

// start em up!
app.listen(PORT ? PORT : 3000, () => {
  console.log(`Server listening on port ${PORT}`);
});
