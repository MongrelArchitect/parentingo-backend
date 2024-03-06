import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import GroupModel from "@models/group";
import CustomRequest from "@interfaces/CustomRequest";

// our routes will first check that we have valid mongodb id
function isValidGroupId(req: Request, res: Response, next: NextFunction) {
  const { groupId } = req.params;
  if (!isValidObjectId(groupId)) {
    res.status(400).json({ message: "Invalid group id" });
  } else {
    next();
  }
}

// just check the existence of a group, don't need its data
async function exists(req: CustomRequest, res: Response, next: NextFunction) {
  const { groupId } = req.params;
  const group = await GroupModel.exists({ id: groupId });
  if (!group) {
    res.status(404).json({ message: `No group found with id ${groupId}` });
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

const group = {
  checkAndAddToRequest,
  exists,
  isValidGroupId,
};

export default group;
