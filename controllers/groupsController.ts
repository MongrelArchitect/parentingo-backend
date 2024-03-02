import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import GroupModel from "@models/group";
import GroupInterface, { GroupList } from "@interfaces/Groups";
import UserInterface from "@interfaces/Users";
import { Document, isValidObjectId } from "mongoose";

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
    };
  });
  return list;
}

// GET info for a single group
const getGroupInfo = [
  // XXX
  asyncHandler(async (req, res) => {
    res.status(200).json();
  }),
];

// GET all groups that an authenticated user is a member of
const getMemberGroups = [
  asyncHandler(async (req, res) => {
    res.status(200).json();
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

// PACTH to add a new member to an existing group
const patchNewMember = [
  asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    if (isValidObjectId(groupId)) {
      next();
    } else {
      res.status(400).json({message: "Invalid group id" });
    }
  }),

  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const group = await GroupModel.findById(groupId)
    if (!group) {
      res.status(404).json({message: `No group found with id "${groupId}"`});
    } else {
      try {
        const user = req.user as UserInterface;
        if (group.members.includes(user.id)) {
          res.status(400).json({
            message: `User already member of "${group.name}" group`,
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
  postNewGroup,
};

export default groupsController;
