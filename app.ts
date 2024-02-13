import { config as dotenvConfig } from "dotenv";
import express from "express";
import mongoose from "mongoose";

// setup environemnt variables
dotenvConfig();
const PORT = process.env.PORT ? +process.env.PORT : undefined;
const MONGO = process.env.MONGO ? process.env.MONGO : undefined;

const app = express();

// set up mongoose & connect to database
mongoose.set("strictQuery", true);
async function connectMongoDB() {
  try {
    if (MONGO) {
      await mongoose.connect(MONGO);
      console.log("Connected to MongoDB server");
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

// middleware
app.use(express.json());

// routes
app.get("/", (req, res) => {
  res.json("Hello Parentingo!");
});

app.post("/users", (req, res) => {
  console.log(req.body);
});

// start em up!
app.listen(PORT ? PORT : 3000, () => {
  console.log(`App listening on port ${PORT}`);
});
