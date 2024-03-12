import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import PostModel from "@models/post";
import CustomRequest from "@interfaces/CustomRequest";

// our routes will first check that we have valid mongodb id
function isValidPostId(req: Request, res: Response, next: NextFunction) {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    res.status(400).json({ message: "Invalid post id" });
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
  const { postId } = req.params;
  const post = await PostModel.findById(postId);
  if (!post) {
    res.status(404).json({ message: `No post found with id ${postId}` });
  } else {
    req.post = post;
    next();
  }
}

const post = {
  checkAndAddToRequest,
  isValidPostId,
};

export default post;
