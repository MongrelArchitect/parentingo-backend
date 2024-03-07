import { Router } from "express";

import postsController from "@controllers/postsController";

import auth from "@middleware/auth";
import group from "@middleware/groups";

const postsRoutes = Router({mergeParams: true});

// POST to submit a new post
postsRoutes.post(
  "/",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  group.checkIfGroupMember,
  postsController.postNewPost,
);

export default postsRoutes;
