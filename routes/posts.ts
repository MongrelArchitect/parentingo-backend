import { Router } from "express";

import postsController from "@controllers/postsController";

import auth from "@middleware/auth";
import group from "@middleware/groups";
import post from "@middleware/posts";

const postsRoutes = Router({ mergeParams: true });

// GET all posts for a particular group
postsRoutes.get(
  "/",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  postsController.getGroupPosts,
);

// GET a single post
postsRoutes.get(
  "/:postId",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  post.isValidPostId,
  post.checkAndAddToRequest,
  postsController.getSinglePost,
);

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
