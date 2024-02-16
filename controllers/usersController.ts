import bcrypt from "bcrypt";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";

import UserInterface from "@interfaces/Users";
import UserModel from "@models/user";

const createNewUser = [
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

  asyncHandler(async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json({
        message: "Invalid form data - see 'errors' for detail",
        errors: validationErrors.mapped(),
      });
    } else {
      const data = matchedData(req);

      try {
        const hashedPass = await bcrypt.hash(data.password, 10);

        const userInfo: UserInterface = {
          email: data.email,
          followers: [],
          following: [],
          lastLogin: new Date(),
          name: data.name,
          password: hashedPass,
          username: data.username,
        };

        const newUser = new UserModel(userInfo);
        const userDoc = await newUser.save();

        res.status(201).json({
          message: "User created",
          user: userDoc,
        });
      } catch (err) {
        res.status(500).json({
          message: "Error creating new user",
          error: err,
        });
      }
    }
  }),
];

const usersController = {
  createNewUser,
};

export default usersController;
