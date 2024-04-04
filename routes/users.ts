import { Router } from "express";
import multer from "multer";

import auth from "@middleware/auth";
import user from "@middleware/users";

import usersController from "@controllers/usersController";

const usersRoutes = Router();

// GET the currently authenticated user's info
usersRoutes.get(
  "/current",
  auth.isAuthenticated,
  usersController.getCurrentUser,
);

// GET public user info (name & username)
usersRoutes.get(
  "/:userId",
  auth.isAuthenticated,
  user.isValidUserId,
  user.exists,
  usersController.getUserInfo,
);

// PATCH to update the current user's profile info
usersRoutes.patch(
  "/current",
  auth.isAuthenticated,
  usersController.patchUpdateProfile,
);

// POST to create a new user
usersRoutes.post("/", usersController.createNewUser);

// POST to log in
usersRoutes.post("/login", usersController.loginUser);

// POST to log out
usersRoutes.post("/logout", auth.isAuthenticated, usersController.logoutUser);

export default usersRoutes;
