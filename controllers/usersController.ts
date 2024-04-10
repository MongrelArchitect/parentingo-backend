import bcrypt from "bcrypt";
import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import { getDownloadURL } from "firebase-admin/storage";
import fs from "fs";
import multer from "multer";
import passport from "passport";
import path from "path";
import sharp from "sharp";

import { storageBucket } from "@configs/firebase";

import CustomRequest from "@interfaces/CustomRequest";
import UserInterface from "@interfaces/Users";

import PostModel from "@models/post";
import UserModel from "@models/user";

import { makePostList } from "@util/posts";

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
        created: new Date(),
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

// GET posts by a specific user
const getPostsByUser = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { userDocument } = req;
    if (!userDocument) {
      throw new Error("Error getting user's info from database");
    } else {
      try {
        // structure our query with any optional parameters
        const { limit, skip, sort } = req.query;
        let query = PostModel.find({ author: userDocument.id });
        if (sort && sort === "newest") {
          query = query.sort("-timestamp");
        }
        if (skip && !isNaN(+skip)) {
          query = query.skip(+skip);
        }
        if (limit && !isNaN(+limit)) {
          query = query.limit(+limit);
        }

        const posts = await query;
        res.status(200).json({
          message: `${posts.length} post${posts.length === 1 ? "" : "s"} found`,
          count: posts.length,
          posts: makePostList(posts),
        });
      } catch (err) {
        res.status(500).json({
          message: "Error getting user's posts",
          error: err,
        });
      }
    }
  },
);

// GET public info about a particular user
const getUserInfo = asyncHandler(async (req: CustomRequest, res) => {
  const { userDocument } = req;
  if (!userDocument) {
    throw new Error("Error getting user info from database");
  } else {
    res.status(200).json({
      message: "User found",
      user: {
        avatar: userDocument.avatar,
        bio: userDocument.bio,
        username: userDocument.username,
        name: userDocument.name,
        followers: userDocument.followers,
        following: userDocument.following,
        created: userDocument.created,
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

// PATCH to follow another user
const patchFollowUser = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { user, userDocument } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else if (!userDocument) {
      throw new Error("Error getting user info from database");
    } else {
      try {
        const authUser = user as UserInterface;
        if (authUser.id === userDocument.id) {
          res.status(400).json({ message: "User cannot follow themselves" });
        } else if (
          userDocument.followers.includes(authUser.id) ||
          authUser.following.includes(userDocument.id)
        ) {
          res.status(400).json({
            message: `User already following ${userDocument.username}`,
          });
        } else {
          const authUserDocument = await UserModel.findById(authUser.id);
          if (!authUserDocument) {
            throw new Error("Error getting authenticated user from database");
          } else {
            userDocument.followers.push(authUser.id);
            authUserDocument.following.push(userDocument.id);
            await userDocument.save();
            await authUserDocument.save();
            res.status(200).json({
              message: `User is now following ${userDocument.username}`,
            });
          }
        }
      } catch (err) {
        res.status(200).json({ message: "Error following user", error: err });
      }
    }
  },
);

// PATCH to unfollow another user
const patchUnfollowUser = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { user, userDocument } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else if (!userDocument) {
      throw new Error("Error getting user info from database");
    } else {
      const authUser = user as UserInterface;
      const authUserDocument = await UserModel.findById(authUser.id);
      if (!authUserDocument) {
        throw new Error("Error getting authenticated user from database");
      } else if (
        !userDocument.followers.includes(authUser.id) ||
        !authUser.following.includes(userDocument.id)
      ) {
        res
          .status(400)
          .json({ message: `User is not following ${userDocument.username}` });
      } else {
        try {
          const followingIndex = authUserDocument.following.indexOf(
            userDocument.id,
          );
          const followerIndex = userDocument.followers.indexOf(
            authUserDocument.id,
          );
          authUserDocument.following.splice(followingIndex, 1);
          userDocument.followers.splice(followerIndex, 1);
          await authUserDocument.save();
          await userDocument.save();
          res.status(200).json({
            message: `User is no longer following ${userDocument.username}`,
          });
        } catch (err) {
          res
            .status(500)
            .json({ message: "Error unfollowing user", error: err });
        }
      }
    }
  },
);

// for handling profile avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../tmp/avatars"));
  },
});

const upload = multer({
  storage: avatarStorage,
  limits: {
    // 10 MB
    fileSize: 10000000,
    files: 1,
    fields: 2,
  },
});

// use if there's any errors or once we've uplodaed to cloud storage
const deleteTempAvatar = (filePath: string) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      throw new Error(err.toString());
    }
  });
};

// PATCH for a user to update their profile info
const patchUpdateProfile = [
  upload.single("avatar"),

  (err: Error, req: CustomRequest, res: Response, next: NextFunction) => {
    if (err) {
      res.status(413).json({ message: "File too large (10MB max)" });
    } else {
      next();
    }
  },

  body("name")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1-255 characters"),

  body("bio")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 20000 })
    .withMessage("Bio cannot be more than 20,000 characters"),

  (req: CustomRequest, res: Response, next: NextFunction) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      // need to delete any uploaded file since we won't be using it
      if (req.file) {
        deleteTempAvatar(req.file.path);
      }
      res.status(400).json({
        message: "Invalid input - check each field for errors",
        errors: validationErrors.mapped(),
      });
    } else {
      next();
    }
  },

  asyncHandler(async (req, res) => {
    const { user } = req;
    if (!user) {
      // need to delete any uploaded file since we won't be using it
      if (req.file) {
        deleteTempAvatar(req.file.path);
      }
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const data = matchedData(req);
        const authUser = user as UserInterface;
        const userToUpdate = await UserModel.findById(authUser.id);
        if (!userToUpdate) {
          throw new Error("Error finding user in database");
        } else {
          // check & apply the fields we're updating
          data.bio ? (userToUpdate.bio = data.bio) : null;
          data.name ? (userToUpdate.name = data.name) : null;
          if (req.file) {
            // set all the paths we need
            const resizedFilename = `${authUser.id}-avatar.webp`;
            const resizedPath = path.join(
              __dirname,
              `../tmp/avatars/resized/${resizedFilename}`,
            );
            const storageDestination = `avatars/${resizedFilename}`;

            // resize & convert to webp format (old browsers be damned)
            await sharp(req.file.path)
              .webp({ quality: 90 })
              .resize(600, 600)
              .toFile(resizedPath);

            // upload to firebase
            await storageBucket.upload(resizedPath, {
              destination: storageDestination,
            });

            // delete both temp images
            deleteTempAvatar(req.file.path);
            deleteTempAvatar(resizedPath);

            // get the download URL to update the user's database entry
            const fileRef = storageBucket.file(storageDestination);
            const downloadURL = await getDownloadURL(fileRef);
            userToUpdate.avatar = downloadURL;
          }

          // save the user's info with whatever changes were made
          await userToUpdate.save();
          res.status(200).json({ message: "User info updated" });
        }
      } catch (err) {
        if (req.file) {
          deleteTempAvatar(req.file.path);
        }
        res
          .status(500)
          .json({ message: "Error updating user info", error: err });
      }
    }
  }),
];

const usersController = {
  createNewUser,
  getCurrentUser,
  getPostsByUser,
  getUserInfo,
  loginUser,
  logoutUser,
  patchFollowUser,
  patchUnfollowUser,
  patchUpdateProfile,
};

export default usersController;
