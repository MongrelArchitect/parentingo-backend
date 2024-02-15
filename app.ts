// package imports
import { config as dotenvConfig } from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { connection } from "mongoose";

// route imports
import usersRoutes from "@routes/users";

// setup environemnt variables
dotenvConfig();
const NODE_ENV = process.env.NODE_ENV;

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use((req, res, next) => {
  // check connection to database before any read/write attempts
  const connected = connection.readyState === 1;
  if (!connected) {
    throw new Error("Not connected to database");
  }
  next();
});

// routes
app.use("/users", usersRoutes);

// 404
app.use((req, res) => {
  // XXX
  // log this in production? our front-end shoudln't be making such requests...
  res.status(404).json({
    message: `No resource found for ${req.method} request at ${req.url}`,
  });
});

// handle any unforseen errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const response =
    NODE_ENV === "development"
      ? {
          message: "Server error",
          error: err.name,
          errorMessage: err.message,
          stack: err.stack,
        }
      : { message: "Server error" };
  // XXX
  // maybe log the error in production?
  res.status(500).json(response);
});

export default app;
