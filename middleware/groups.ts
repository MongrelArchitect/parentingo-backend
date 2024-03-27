import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Cursor, isValidObjectId } from "mongoose";
import GroupModel from "@models/group";
import CustomRequest from "@interfaces/CustomRequest";
import UserInterface from "@interfaces/Users";

// our routes will first check that we have valid mongodb id
function isValidGroupId(req: Request, res: Response, next: NextFunction) {
  const { groupId } = req.params;
  if (!isValidObjectId(groupId)) {
    res.status(400).json({ message: "Invalid group id" });
  } else {
    next();
  }
}

// pass the group document along in the request body or 404 if it doesn't exist
async function checkAndAddToRequest(
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) {
  const { groupId } = req.params;
  const group = await GroupModel.findById(groupId);
  if (!group) {
    res.status(404).json({ message: `No group found with id ${groupId}` });
  } else {
    req.group = group;
    next();
  }
}

const checkIfGroupMember = asyncHandler(
  // checks if the currently authenticated user is a member of the group
  async (req: CustomRequest, res, next) => {
    const { group, user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else if (!group) {
      throw new Error("Error getting group info from database");
    } else {
      const userInfo = user as UserInterface;
      if (!group.members.includes(userInfo.id)) {
        res.status(403).json({
          message: `${userInfo.username} is not a member of ${group.name} group`,
        });
      } else {
        next();
      }
    }
  },
);

const checkIfGroupAdmin = asyncHandler(
  // checks if the currently authenticated user is the admin of the group
  async (req: CustomRequest, res, next) => {
    const { group, user } = req;
    if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else if (!group) {
      throw new Error("Error getting group info from database");
    } else {
      const userInfo = user as UserInterface;
      if (group.admin !== userInfo.id) {
        res.status(403).json({
          message: "Only group admin can make this request",
        });
      } else {
        next();
      }
    }
  },
);

const group = {
  checkAndAddToRequest,
  checkIfGroupAdmin,
  checkIfGroupMember,
  isValidGroupId,
};

export default group;
