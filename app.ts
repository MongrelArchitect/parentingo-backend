// package imports
import { config as dotenvConfig } from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import helmet from "helmet";
import { connection } from "mongoose";
import passport from "passport";

// route imports
import usersRoutes from "@routes/users";

// configs
import setupPassport from "@configs/passport";
import store from "@configs/sessionStore";

// setup environemnt variables
dotenvConfig();
const NODE_ENV = process.env.NODE_ENV;
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not defined");
}

// setup app & auth stuff
const app = express();
setupPassport();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(session({
  // XXX
  // seems hacky to use "as string" here, better way to do it? ostensibly we'll
  // have our environment variables set correctly, but can't have a fallback
  // here for obvious reasons...
  secret: SESSION_SECRET as string,
  store,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
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
    NODE_ENV && NODE_ENV === "development"
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
