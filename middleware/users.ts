import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import UserModel from "@models/user";;
import CustomRequest from "@interfaces/CustomRequest";

// our routes will first check that we have valid mongodb id
function isValidUserId(req: Request, res: Response, next: NextFunction) {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    res.status(400).json({ message: "Invalid user id" });
  } else {
    next();
  }
}

// pass the user document along in the request body or 404 if it doesn't exist
async function exists(req: CustomRequest, res: Response, next: NextFunction) {
  const { userId } = req.params;
  const user = await UserModel.findById(userId);
  if (!user) {
    res.status(404).json({ message: `No user found with id ${userId}` });
  } else {
    req.userDocument = user;
    next();
  }
}

const user = {
  exists,
  isValidUserId,
};

export default user;
