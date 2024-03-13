import asyncHandler from "express-async-handler";
import { NextFunction, Response } from "express";
import { body, matchedData, validationResult } from "express-validator";

import CommentInterface from "@interfaces/Comments";
import CustomRequest from "@interfaces/CustomRequest";
import UserInterface from "@interfaces/Users";
import CommentModel from "@models/comment";

// GET a count for how many comments a post has
const getCommentCount = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { group, post } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!post) {
      throw new Error("Error getting post info from database");
    } else {
      try {
        const count = await CommentModel.countDocuments({ post: post.id });
        res.status(200).json({
          message: `Post has ${count} comment${count === 1 ? "" : "s"}`,
          count,
        });
      } catch (err) {
        res
          .status(500)
          .json({ message: "Error getting comment count", error: err });
      }
    }
  },
);

// POST to add a new comment
const postNewComment = [
  body("text")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Text required")
    .isLength({ min: 1, max: 20000 })
    .withMessage("Comment cannot be more than 20,000 characters"),

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

  asyncHandler(async (req: CustomRequest, res) => {
    const { group, post, user } = req;
    if (!user) {
      throw new Error("Error deserializing user's info");
    } else if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!post) {
      throw new Error("Error getting post info from database");
    } else {
      try {
        const data = matchedData(req);
        const userInfo = user as UserInterface;
        const commentInfo: CommentInterface = {
          id: "",
          author: userInfo.id,
          timestamp: new Date(),
          text: data.text,
          post: post.id,
        };
        const newComment = new CommentModel(commentInfo);
        newComment.id = newComment._id.toString();
        await newComment.save();
        res.status(200).json({
          message: "Comment created successfully",
          uri: `/groups/${group.id}/posts/${post.id}/comments/${newComment.id}`,
        });
      } catch (err) {
        res
          .status(500)
          .json({ message: "Error creating new comment", error: err });
      }
    }
  }),
];

const commentsController = {
  getCommentCount,
  postNewComment,
};

export default commentsController;
