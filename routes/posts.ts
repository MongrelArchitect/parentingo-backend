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

// just GET a post count for the group
postsRoutes.get(
  "/count",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  postsController.getPostCount,
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

// PATCH to "like" a post
postsRoutes.patch(
  "/:postId/like",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  group.checkIfGroupMember,
  post.isValidPostId,
  post.checkAndAddToRequest,
  postsController.patchLikePost,
);

// PATCH to make a post "sticky"
postsRoutes.patch(
  "/:postId/sticky",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  post.isValidPostId,
  post.checkAndAddToRequest,
  group.checkAllowedAndSetRole,
  postsController.patchSticky,
);

// PATCH to "unlike" a post
postsRoutes.patch(
  "/:postId/unlike",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  group.checkIfGroupMember,
  post.isValidPostId,
  post.checkAndAddToRequest,
  postsController.patchUnlikePost,
);

// PATCH to "unstick" a sticky post
postsRoutes.patch(
  "/:postId/unstick",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  post.isValidPostId,
  post.checkAndAddToRequest,
  group.checkAllowedAndSetRole,
  postsController.patchUnstick,
);

// DELETE for admin or mod to remove a post
postsRoutes.delete(
  "/:postId",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.checkAndAddToRequest,
  post.isValidPostId,
  post.checkAndAddToRequest,
  group.checkAllowedAndSetRole,
  postsController.deletePost,
);

export default postsRoutes;
