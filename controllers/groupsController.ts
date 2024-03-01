import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import GroupModel from "@models/group";
import GroupInterface, { GroupList } from "@interfaces/Groups";
import UserInterface from "@interfaces/Users";
import { Document } from "mongoose";

function makeGroupList(groups: Document[]): GroupList {
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

const getGroupInfo = [
  // XXX
  asyncHandler(async (req, res) => {
    res.status(401).json({ message: "User authentication required" });
  }),
];

const getMemberGroups = [];

const getOwnedGroups = [
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "User authentication required" });
    } else {
      next();
    }
  }),

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

const postNewGroup = [
  asyncHandler(async (req, res, next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).json({ message: "User authentication required" });
    }
  }),

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
  getOwnedGroups,
  postNewGroup,
};

export default groupsController;
