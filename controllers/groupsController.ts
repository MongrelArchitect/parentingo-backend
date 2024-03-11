import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import { Document } from "mongoose";

import CustomRequest from "@interfaces/CustomRequest";
import GroupInterface, { GroupList } from "@interfaces/Groups";
import UserInterface from "@interfaces/Users";

import GroupModel from "@models/group";

function makeGroupList(groups: Document[]): GroupList {
  // could just return the raw array, but i want it a bit cleaner...
  const list: GroupList = {};
  groups.forEach((group) => {
    // XXX
    // better way to do this?
    const groupInfo = group as unknown as GroupInterface;
    list[groupInfo.id] = {
      name: groupInfo.name,
      description: groupInfo.description,
      id: groupInfo.id,
      admin: groupInfo.admin,
      mods: groupInfo.mods,
      members: groupInfo.members,
      banned: groupInfo.banned,
    };
  });
  return list;
}

// PATCH to demote a user from mod to regular member
const deleteFromMods = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    // "user" is the currently authenticated user
    // "userDocument" is the mongoose document of the user we're demoting
    const { group, user, userDocument } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!userDocument) {
      throw new Error("Error getting mod's info from database");
    } else if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        // time to see if it's the admin making the request
        const authUser = user as UserInterface;
        if (group.admin !== authUser.id) {
          // not admin = no go
          res.status(403).json({ message: "Only group admin can demote mods" });
        } else {
          if (!group.mods.includes(userDocument.id)) {
            // only group members can be mods
            res.status(400).json({
              message: "Only mods can be demoted",
            });
          } else {
            // admin = go for it
            group.mods.splice(group.mods.indexOf(userDocument.id), 1);
            await group.save();
            res.status(200).json({
              message: `${userDocument.username} demoted from mod to member`,
            });
          }
        }
      } catch (err) {
        res.status(500).json({
          message: "Error demoting user from mod to regular member",
          error: err,
        });
      }
    }
  },
);

// GET info for a single group
const getGroupInfo = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { group } = req;
  if (!group) {
    // this shouldn't happen since our prior middleware checks for it,
    // but just in case & to keep typescript happy
    throw new Error("Error getting group info from database");
  } else {
    const groupInfo: GroupInterface = {
      name: group.name,
      description: group.description,
      id: group.id,
      admin: group.admin,
      mods: group.mods,
      members: group.members,
      banned: group.banned,
    };
    res.status(200).json({ message: "Group found", group: groupInfo });
  }
});

// GET all groups that an authenticated user is a member of
const getMemberGroups = [
  asyncHandler(async (req, res) => {
    const { user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const userInfo = user as UserInterface;
        const groups = await GroupModel.find({ members: userInfo.id });
        if (!groups.length) {
          res.status(200).json({ message: "Not a member of any groups" });
        } else {
          res.status(200).json({
            message: `User is a member of ${groups.length} group${groups.length === 1 ? "" : "s"}`,
            groups: makeGroupList(groups),
          });
        }
      } catch (err) {
        res.status(500).json({
          message: "Error finding groups",
          error: err,
        });
      }
    }
  }),
];

// GET all groups that an authenticated user owns / is admin of
const getOwnedGroups = [
  asyncHandler(async (req, res) => {
    const { user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const userInfo = user as UserInterface;
        const groups = await GroupModel.find({ admin: userInfo.id });
        if (!groups.length) {
          res.status(200).json({ message: "No owned groups found" });
        } else {
          res.status(200).json({
            message: `User owns ${groups.length} group${groups.length === 1 ? "" : "s"}`,
            groups: makeGroupList(groups),
          });
        }
      } catch (err) {
        res.status(500).json({
          message: "Error finding owned groups",
          error: err,
        });
      }
    }
  }),
];

// PATCH to remove a user from the group & ban them from joining again
const patchBanUser = asyncHandler(async (req: CustomRequest, res: Response) => {
  // "user" is the currently authenticated user
  // "userDocument" is the mongoose document of the user we're banning
  const { group, user, userDocument } = req;
  if (!group) {
    throw new Error("Error getting group info from database");
  } else if (!userDocument) {
    throw new Error("Error getting user's info from database");
  } else if (!user) {
    throw new Error("Error deserializing authenticated user's info");
  } else {
    try {
      const authUser = user as UserInterface;
      if (group.admin !== authUser.id) {
        // not admin = no go
        res.status(403).json({ message: "Only group admin can ban users" });
      } else if (!group.members.includes(userDocument.id)) {
        // only group members can be banned
        res.status(400).json({
          message: "Only group members can be banned",
        });
      } else if (authUser.id === userDocument.id) {
        // admin can't ban themselves
        res.status(403).json({ message: "Admin cannot ban themselves" });
      } else {
        // admin = go for it
        group.members.splice(group.members.indexOf(userDocument.id), 1);
        group.banned.push(userDocument.id);
        if (group.mods.includes(userDocument.id)) {
          group.mods.splice(group.mods.indexOf(userDocument.id), 1);
        }
        await group.save();
        res.status(200).json({
          message: `${userDocument.username} removed and banned from ${group.name} group`,
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Error banning user",
        error: err,
      });
    }
  }
});

// PATCH for a user to remove themselves from group membership
const patchLeaveGroup = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { group, user } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const userInfo = user as UserInterface;
        if (group.admin === userInfo.id) {
          // admin can't leave group...don't forget, you're here forever!
          res.status(403).json({ message: "Admin cannot leave group" });
        } else if (!group.members.includes(userInfo.id)) {
          // user has to be a member of the group in order to leave it
          res
            .status(403)
            .json({ message: `User is not a member of ${group.name} group` });
        } else {
          // leave the group
          group.members.splice(group.members.indexOf(userInfo.id), 1);
          let userType = "User";
          if (group.mods.includes(userInfo.id)) {
            // make sure to remove any mod role as well
            group.mods.splice(group.mods.indexOf(userInfo.id), 1);
            userType = "Mod";
          }
          await group.save();
          res
            .status(200)
            .json({ message: `${userType} has left ${group.name} group` });
        }
      } catch (err) {
        res.status(500).json({
          message: "Error leaving group",
          error: err,
        });
      }
    }
  },
);

// PATCH to add a new member to an existing group
const patchNewMember = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { group, user } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const userInfo = user as UserInterface;
        if (group.members.includes(userInfo.id)) {
          res.status(400).json({
            message: `User already member of "${group.name}" group`,
          });
        } else if (group.banned.includes(userInfo.id)) {
          res.status(403).json({
            message: `User banned from joining ${group.name} group`,
          });
        } else {
          group.members.push(userInfo.id);
          await group.save();
          res.status(200).json({
            message: `User added to "${group.name}" group`,
          });
        }
      } catch (err) {
        res.status(500).json({
          message: "Error adding user to group",
          error: err,
        });
      }
    }
  },
);

// PATCH to add a new mod to an existing group
const patchNewMod = asyncHandler(async (req: CustomRequest, res: Response) => {
  // "user" is the currently authenticated user
  // "userDocument" is the mongoose document for the user we're trying to add
  const { group, user, userDocument } = req;
  if (!group) {
    throw new Error("Error getting group info from database");
  } else if (!userDocument) {
    throw new Error("Error getting new mod user's info from database");
  } else if (!user) {
    throw new Error("Error deserializing authenticated user's info");
  } else {
    try {
      const authUser = user as UserInterface;
      if (group.admin !== authUser.id) {
        // not admin = no go
        res
          .status(403)
          .json({ message: "Only group admin can designate mods" });
      } else if (!group.members.includes(userDocument.id)) {
        // only group members can be mods
        res.status(400).json({
          message: "Only group members can be mods",
        });
      } else {
        // admin = go for it
        group.mods.push(userDocument.id);
        await group.save();
        res.status(200).json({
          message: `${userDocument.username} added as mod to ${group.name} group`,
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Error promoting user to mod",
        error: err,
      });
    }
  }
});

const patchUnbanUser = asyncHandler(async (req: CustomRequest, res) => {
  // "user" is the currently authenticated user
  // "userDocument" is the mongoose document of the user we're banning
  const { group, user, userDocument } = req;
  if (!group) {
    throw new Error("Error getting group info from database");
  } else if (!userDocument) {
    throw new Error("Error getting user's info from database");
  } else if (!user) {
    throw new Error("Error deserializing authenticated user's info");
  } else {
    try {
      const authUser = user as UserInterface;
      if (group.admin !== authUser.id) {
        // not admin = no go
        res.status(403).json({ message: "Only group admin can unban users" });
      } else if (!group.banned.includes(userDocument.id)) {
        // only banned users can be ubanned
        res.status(400).json({
          message: `${userDocument.username} is not banned`,
        });
      } else {
        // admin = go for it
        group.banned.splice(group.banned.indexOf(userDocument.id), 1);
        await group.save();
        res.status(200).json({
          message: `${userDocument.username} has been unbanned from ${group.name} group`,
        });
      }
    } catch (err) {
      res.status(500).json({
        message: "Error unbanning user",
        error: err,
      });
    }
  }
});

// POST to create a new group with currently authenticated user as admin / owner
const postNewGroup = [
  body("name")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Name required")
    .toLowerCase()
    .isLength({ max: 255 })
    .withMessage("Name cannot be more than 255 characters")
    .custom(async (value) => {
      const existingUser = await GroupModel.findOne({ name: value });
      if (existingUser) {
        throw new Error("Group with that name already exists");
      }
    }),

  body("description")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Description required")
    .isLength({ max: 255 })
    .withMessage("Description cannot be more than 255 characters"),

  (req: CustomRequest, res: Response, next: NextFunction) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json({
        message: "Invalid input - check each field for errors",
        errors: validationErrors.mapped(),
      });
    } else {
      next();
    }
  },

  asyncHandler(async (req, res) => {
    const { user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      const data = matchedData(req);
      try {
        const userInfo = user as UserInterface;
        const groupInfo: GroupInterface = {
          admin: userInfo.id, // user who creates the group is the admin
          name: data.name,
          description: data.description,
          mods: [userInfo.id], // admin is also a mod
          members: [userInfo.id], // admins and mods are also members
          id: "",
          banned: [],
        };
        const newGroup = new GroupModel(groupInfo);
        groupInfo.id = newGroup._id.toString();
        newGroup.id = newGroup._id.toString();
        await newGroup.save();
        res
          .status(201)
          .json({ message: "Group created successfully", group: groupInfo });
      } catch (err) {
        res.status(500).json({
          message: "Error creating new group",
          error: err,
        });
      }
    }
  }),
];

const groupsController = {
  deleteFromMods,
  getGroupInfo,
  getMemberGroups,
  getOwnedGroups,
  patchBanUser,
  patchLeaveGroup,
  patchNewMember,
  patchNewMod,
  patchUnbanUser,
  postNewGroup,
};

export default groupsController;
