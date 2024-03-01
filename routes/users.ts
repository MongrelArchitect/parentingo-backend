import { Router } from "express";

import auth from "@middleware/auth";

import usersController from "@controllers/usersController";

const usersRoutes = Router();

// POST to create a new user
usersRoutes.post("/", usersController.createNewUser);

// GET the currently authenticated user's info
usersRoutes.get(
  "/current",
  auth.isAuthenticated,
  usersController.getCurrentUser,
);

// POST to log in
usersRoutes.post("/login", usersController.loginUser);

// POST to log out
usersRoutes.post("/logout", auth.isAuthenticated, usersController.logoutUser);

export default usersRoutes;
