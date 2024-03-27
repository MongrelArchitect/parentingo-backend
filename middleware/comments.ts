import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";

import CustomRequest from "@interfaces/CustomRequest";

import CommentModel from "@models/comment";

// our routes will first check that we have valid mongodb id
function isValidCommentId(req: Request, res: Response, next: NextFunction) {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    res.status(400).json({ message: "Invalid comment id" });
  } else {
    next();
  }
}

// pass the post document along in the request body or 404 if it doesn't exist
async function checkAndAddToRequest(
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) {
  const { commentId } = req.params;
  const comment = await CommentModel.findById(commentId);
  if (!comment) {
    res.status(404).json({ message: `No comment found with id ${commentId}` });
  } else {
    req.comment = comment;
    next();
  }
}

const comment = {
  checkAndAddToRequest,
  isValidCommentId,
};

export default comment;
