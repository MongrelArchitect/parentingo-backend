import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import GroupModel from "@models/group";
import GroupInterface from "@interfaces/Groups";
import UserInterface from "@interfaces/Users";

const getGroupInfo = [
  // XXX
  asyncHandler(async (req, res) => {
    res.status(401).json({ message: "User authentication required" });
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
          mods: [user.id], // admin is also a mod
          members: [user.id], // admins and mods are also members
        };
        const newGroup = new GroupModel(groupInfo);
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
  postNewGroup,
};

export default groupsController;
