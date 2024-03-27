import { Router } from "express";

import commentsController from "@controllers/commentsController";

import auth from "@middleware/auth";
import comment from "@middleware/comments";
import group from "@middleware/groups";
import post from "@middleware/posts";

const commentsRoutes = Router({ mergeParams: true });

// GET a posts comment count
commentsRoutes.get(
  "/count",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  post.isValidPostId,
  post.checkAndAddToRequest,
  commentsController.getCommentCount,
);

// GET all comments for a post
commentsRoutes.get(
  "/",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  post.isValidPostId,
  post.checkAndAddToRequest,
  commentsController.getAllComments,
);

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

// DELETE a comment
commentsRoutes.delete(
  "/:commentId",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  comment.isValidCommentId,
  comment.checkAndAddToRequest,
  commentsController.deleteComment,
);

export default commentsRoutes;
