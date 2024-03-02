import { Router } from "express";

import groupsController from "@controllers/groupsController";

import auth from "@middleware/auth";

const groupsRoutes = Router();

// GET all groups that the currently authenticated user is a member of
groupsRoutes.get(
  "/member",
  auth.isAuthenticated,
  groupsController.getMemberGroups,
);

// GET all the groups for which the currently authenticated user is admin
groupsRoutes.get(
  "/owned",
  auth.isAuthenticated,
  groupsController.getOwnedGroups,
);

// GET the info for a particular group
groupsRoutes.get(
  "/:groupId",
  auth.isAuthenticated,
  groupsController.getGroupInfo,
);

// POST to create a new group
groupsRoutes.post("/", auth.isAuthenticated, groupsController.postNewGroup);

// PATCH to add a member to an existing group
groupsRoutes.patch(
  "/:groupId/members",
  auth.isAuthenticated,
  groupsController.patchNewMember,
);

export default groupsRoutes;
