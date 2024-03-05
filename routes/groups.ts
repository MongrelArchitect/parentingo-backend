import { Router } from "express";

import groupsController from "@controllers/groupsController";

import auth from "@middleware/auth";
import group from "@middleware/groups";
import user from "@middleware/users";

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
  group.isValidGroupId,
  group.exists,
  groupsController.getGroupInfo,
);

// POST to create a new group
groupsRoutes.post("/", auth.isAuthenticated, groupsController.postNewGroup);

// PATCH to add the current user to an existing group as a member
groupsRoutes.patch(
  "/:groupId/members",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.exists,
  groupsController.patchNewMember,
);

// PATCH to add a specified member to an existing group as a mod
groupsRoutes.patch(
  "/:groupId/mods/:userId",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.exists,
  user.isValidUserId,
  user.exists,
  groupsController.patchNewMod,
);

// PATCH to demote a user from mod to ordinary member
groupsRoutes.patch(
  "/:groupId/mods/demote/:userId",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.exists,
  user.isValidUserId,
  user.exists,
  groupsController.deleteFromMods,
);

// PATCH for a user to remove themselves from group membership
// XXX
groupsRoutes.patch(
  "/:groupId/leave",
  auth.isAuthenticated,
  group.isValidGroupId,
  group.exists,
  groupsController.patchLeaveGroup,
);

// PATCH for an admin to remove a member & ban them from joining the group
// XXX

export default groupsRoutes;
