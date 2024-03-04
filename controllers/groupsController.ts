import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import { Document, isValidObjectId } from "mongoose";

import GroupInterface, { GroupList } from "@interfaces/Groups";
import UserInterface from "@interfaces/Users";

import GroupModel from "@models/group";
import UserModel from "@models/user";

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

// GET info for a single group
const getGroupInfo = [
  asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    if (isValidObjectId(groupId)) {
      next();
    } else {
      res.status(400).json({ message: "Invalid group id" });
    }
  }),

  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const groupInfo = await GroupModel.findById(groupId);
    if (!groupInfo) {
      res.status(404).json({ message: `No group found with id ${groupId}` });
    } else {
      const group: GroupInterface = {
        name: groupInfo.name,
        description: groupInfo.description,
        admin: groupInfo.admin,
        mods: groupInfo.mods,
        members: groupInfo.members,
        id: groupInfo.id,
        banned: groupInfo.banned,
      };
      res.status(200).json({ message: "Group found", group });
    }
  }),
];

// GET all groups that an authenticated user is a member of
const getMemberGroups = [
  asyncHandler(async (req, res) => {
    try {
      const user = req.user as UserInterface;
      const groups = await GroupModel.find({ members: user.id });
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
  }),
];

// GET all groups that an authenticated user owns / is admin of
const getOwnedGroups = [
  asyncHandler(async (req, res) => {
    try {
      const user = req.user as UserInterface;
      const groups = await GroupModel.find({ admin: user.id });
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
  }),
];

// PATCH to add a new member to an existing group
const patchNewMember = [
  asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    if (isValidObjectId(groupId)) {
      next();
    } else {
      res.status(400).json({ message: "Invalid group id" });
    }
  }),

  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const group = await GroupModel.findById(groupId);
    if (!group) {
      res.status(404).json({ message: `No group found with id "${groupId}"` });
    } else {
      try {
        const user = req.user as UserInterface;
        if (group.members.includes(user.id)) {
          res.status(400).json({
            message: `User already member of "${group.name}" group`,
          });
        } else if (group.banned.includes(user.id)) {
          res.status(403).json({
            message: `User banned from joining ${group.name} group`
          });
        } else {
          group.members.push(user.id);
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
  }),
];

// PATCH to add a new mod to an existing group
const patchNewMod = [
  // first check valid group id
  asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    if (isValidObjectId(groupId)) {
      next();
    } else {
      res.status(400).json({ message: "Invalid group id" });
    }
  }),

  // then check valid user id
  asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    if (isValidObjectId(userId)) {
      next();
    } else {
      res.status(400).json({ message: "Invalid user id" });
    }
  }),

  asyncHandler(async (req, res) => {
    // XXX
    // this is full of confusing control flow...better way to break it up
    // without making multiple database queries?
    try {
      // we've got valid group & user ids, try and find 'em
      const { groupId, userId } = req.params;
      const group = await GroupModel.findById(groupId);
      const userToBeMod = await UserModel.findById(userId);
      if (group && userToBeMod) {
        // found 'em both, time to see if it's the admin making the request
        const authUser = req.user as UserInterface;
        if (group.admin !== authUser.id) {
          // not admin = no go
          res
            .status(403)
            .json({ message: "Only group admin can designate mods" });
        } else {
          if (!group.members.includes(userToBeMod.id)) {
            // only group members can be mods
            res.status(400).json({
              message: "Only group members can be mods",
            });
          }
          // admin = go for it
          group.mods.push(userToBeMod.id);
          await group.save();
          res.status(200).json({
            message: `${userToBeMod.username} added as mod to ${group.name} group`,
          });
        }
      } else {
        if (!group && userToBeMod) {
          // we've got a real user but the group wasn't found
          res
            .status(404)
            .json({ message: `No group found with id ${groupId}` });
        }
        if (group && !userToBeMod) {
          // we've got a real group but the user wasn't found
          res.status(404).json({ message: `No user found with id ${userId}` });
        }
        if (!group && !userToBeMod) {
          // neither the group or the user actually exist
          res.status(404).json({
            message: `No group found with id ${groupId} and no user found with id ${userId}`,
          });
        }
      }
    } catch (err) {
      res.status(500).json({
        message: "Error finding group and/or user",
        error: err,
      });
    }
  }),
];

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

  asyncHandler(async (req, res, next) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json({
        message: "Invalid input - check each field for errors",
        errors: validationErrors.mapped(),
      });
    } else {
      next();
    }
  }),

  asyncHandler(async (req, res, next) => {
    if (req.user) {
      const data = matchedData(req);
      try {
        const user = req.user as UserInterface;
        const groupInfo: GroupInterface = {
          admin: user.id, // user who creates the group is the admin
          name: data.name,
          description: data.description,
          mods: [user.id], // admin is also a mod
          members: [user.id], // admins and mods are also members
          id: "",
          banned: [],
        };
        const newGroup = new GroupModel(groupInfo);
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
    } else {
      next();
    }
  }),
];

const groupsController = {
  getGroupInfo,
  getMemberGroups,
  getOwnedGroups,
  patchNewMember,
  patchNewMod,
  postNewGroup,
};

export default groupsController;
