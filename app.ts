// package imports
import cors from "cors";
import { config as dotenvConfig } from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import helmet from "helmet";
import { connection } from "mongoose";
import passport from "passport";

// route imports
import groupsRoutes from "@routes/groups";
import postsRoutes from "@routes/posts";
import usersRoutes from "@routes/users";

// configs
import setupPassport from "@configs/passport";
import store from "@configs/sessionStore";

// interfaces
import PassportError from "@interfaces/PassportError";

// setup environemnt variables
dotenvConfig();
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not defined");
}

// setup app & auth stuff
const app = express();
setupPassport();

// middleware
app.use(
  cors({
    origin: CORS_ORIGIN,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(
  session({
    // XXX
    // seems hacky to use "as string" here, better way to do it? ostensibly we'll
    // have our environment variables set correctly, but can't have a fallback
    // here for obvious reasons...
    secret: SESSION_SECRET as string,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "strict",
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  // check connection to database before any read/write attempts
  const connected = connection.readyState === 1;
  if (!connected) {
    throw new Error("Not connected to database");
  } else {
    next();
  }
});

// routes
app.use("/groups", groupsRoutes);
app.use("/groups/:groupId/posts", postsRoutes);
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
app.use(
  (err: PassportError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.status;
    const response = {
      name: err.name,
      error: err.toString(),
      message: err.message,
    };

    // XXX
    // maybe log the error in production?
    res.status(statusCode || 500).json(response);
  },
);

export default app;
