import bcrypt from "bcrypt";
import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import passport from "passport";

import CustomRequest from "@interfaces/CustomRequest";
import UserInterface from "@interfaces/Users";
import UserModel from "@models/user";

// POST to create a new user
const createNewUser = [
  (req: CustomRequest, res: Response, next: NextFunction) => {
    // already authenticated with active session, can't make new user
    if (req.isAuthenticated()) {
      res.status(400).json({
        message:
          "Authenticated session already exists - log out to create new user",
      });
    } else {
      next();
    }
  },

  body("email")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Email required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Email must be between 3-255 characters")
    .isEmail()
    .withMessage("Invalid email")
    .custom(async (value) => {
      const existingUser = await UserModel.findOne({ email: value });
      if (existingUser) {
        throw new Error("Email already in use");
      }
    }),

  body("username")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Username required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3-20 characters")
    .toLowerCase()
    .custom(async (value) => {
      const existingUser = await UserModel.findOne({ username: value });
      if (existingUser) {
        throw new Error("Username already taken");
      }
    }),

  body("password")
    .notEmpty()
    .withMessage("Password required")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage("Password does not meet requirements"),

  body("name")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Name required")
    .isLength({ max: 255 })
    .withMessage("Name cannot be more than 255 characters"),

  (req: CustomRequest, res: Response, next: NextFunction) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json({
        message: "Invalid input - check each field for errors",
        errors: validationErrors.mapped(),
      });
    } else {
      next();
    }
  },

  asyncHandler(async (req, res, next) => {
    const data = matchedData(req);

    try {
      const hashedPass = await bcrypt.hash(data.password, 10);

      const userInfo: UserInterface = {
        email: data.email,
        followers: [],
        following: [],
        // id is required, but we don't have it yet
        id: "tbd",
        lastLogin: new Date(),
        name: data.name,
        password: hashedPass,
        username: data.username,
      };

      const newUser = new UserModel(userInfo);
      // now we have the id, stringify it!
      newUser.id = newUser._id.toString();
      await newUser.save();
      next();
    } catch (err) {
      res.status(500).json({
        message: "Error creating new user",
        error: err,
      });
    }
  }),

  passport.authenticate("local"),

  asyncHandler(async (req, res) => {
    const { user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      res.status(201).json({
        message: "User created",
        user,
      });
    }
  }),
];

// GET the currerntly authenticated user's deserialized info
const getCurrentUser = asyncHandler(async (req, res) => {
  const { user } = req;
  if (!user) {
    throw new Error("Error deserializing authenticated user's info");
  } else {
    res.status(200).json(user);
  }
});

// GET public info about a particular user (username & real name)
const getUserInfo = asyncHandler(async (req: CustomRequest, res) => {
  const { userDocument } = req;
  if (!userDocument) {
    throw new Error("Error getting user info from database");
  } else {
    res.status(200).json({
      message: "User found",
      user: {
        username: userDocument.username,
        name: userDocument.name,
        followers: userDocument.followers,
        following: userDocument.following,
      },
    });
  }
});

// POST to login a user
const loginUser = [
  body("username").trim().escape().notEmpty().withMessage("Username required"),

  body("password").notEmpty().withMessage("Password required"),

  (req: CustomRequest, res: Response, next: NextFunction) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json({
        message: "Invalid form data - see 'errors' for detail",
        errors: validationErrors.mapped(),
      });
    } else {
      next();
    }
  },

  (req: CustomRequest, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      res.status(403).json({
        message: "User already authenticated",
      });
    } else {
      next();
    }
  },

  passport.authenticate("local", { failWithError: true }),

  asyncHandler(async (req, res) => {
    const { user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      res.status(200).json({ message: "Login successful", id: user });
    }
  }),
];

// POST to logout a user, clear cookies & delete session from database
const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("connect.sid");
  req.logout((err) => {
    if (err) {
      throw new Error("Error logging out");
    } else {
      req.session.destroy((err) => {
        if (err) {
          throw new Error("Error destroying session");
        } else {
          res.status(200).json({ message: "User logged out" });
        }
      });
    }
  });
});

const usersController = {
  createNewUser,
  getCurrentUser,
  getUserInfo,
  loginUser,
  logoutUser,
};

export default usersController;
