import { config as dotenvConfig } from "dotenv";
import app from "app";
import connectMongoDB from "@configs/mongoose";

// setup environemnt variables
dotenvConfig();
const PORT = process.env.PORT;

// connect to database
connectMongoDB();

// start em up!
app.listen(PORT ? +PORT : 3000, () => {
  console.log(`Server listening on port ${PORT}`);
});
