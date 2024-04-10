import { Router } from "express";

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

// GET all posts by a specific user
usersRoutes.get(
  "/:userId/posts",
  auth.isAuthenticated,
  user.isValidUserId,
  user.exists,
  usersController.getPostsByUser,
);

// PATCH to update the current user's profile info
usersRoutes.patch(
  "/current",
  auth.isAuthenticated,
  usersController.patchUpdateProfile,
);

// PATCH to follow another user
usersRoutes.patch(
  "/:userId/follow",
  auth.isAuthenticated,
  user.isValidUserId,
  user.exists,
  usersController.patchFollowUser,
);

// PATCH to unfollow another user
usersRoutes.patch(
  "/:userId/unfollow",
  auth.isAuthenticated,
  user.isValidUserId,
  user.exists,
  usersController.patchUnfollowUser,
);

// POST to create a new user
usersRoutes.post("/", usersController.createNewUser);

// POST to log in
usersRoutes.post("/login", usersController.loginUser);

// POST to log out
usersRoutes.post("/logout", auth.isAuthenticated, usersController.logoutUser);

export default usersRoutes;
