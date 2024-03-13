import { Router } from "express";

import commentsController from "@controllers/commentsController";

import auth from "@middleware/auth";
import group from "@middleware/groups";
import post from "@middleware/posts";

const commentsRoutes = Router({ mergeParams: true });

// POST a new comment
commentsRoutes.post(
  "/",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  group.checkIfGroupMember,
  post.isValidPostId,
  post.checkAndAddToRequest,
  commentsController.postNewComment,
);

export default commentsRoutes;
