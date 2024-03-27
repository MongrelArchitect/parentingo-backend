import asyncHandler from "express-async-handler";
import { NextFunction, Response } from "express";
import { body, matchedData, validationResult } from "express-validator";
import { Document } from "mongoose";

import CommentInterface, { CommentList } from "@interfaces/Comments";
import CustomRequest from "@interfaces/CustomRequest";
import UserInterface from "@interfaces/Users";
import CommentModel from "@models/comment";

function makeCommentsList(comments: Document[]): CommentList {
  // could just return the raw array, but i want it a bit cleaner...
  const list: CommentList = {};
  comments.forEach((comment) => {
    // XXX
    // better way to do this?
    const commentInfo = comment as unknown as CommentInterface;
    list[commentInfo.id] = {
      id: commentInfo.id,
      author: commentInfo.author,
      timestamp: commentInfo.timestamp,
      text: commentInfo.text,
      post: commentInfo.post,
    };
  });
  return list;
}

// DELETE a single comment 
const deleteComment = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { comment, group, user } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!comment) {
      throw new Error("Error getting comment info from database");
    } else if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const authUser = user as UserInterface;
        if (authUser.id !== group.admin) {
          res
            .status(403)
            .json({ message: "Only group admin can delete comments" });
        } else {
          // delete the post itself, then any of its comments
          await CommentModel.findByIdAndDelete(comment.id);
          res.status(200).json({ message: "Comment deleted" });
        }
      } catch (err) {
        res.status(500).json({
          message: "Error deleting comment",
          error: err,
        });
      }
    }
  },
);

// GET all comments for a post
const getAllComments = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { group, post } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!post) {
      throw new Error("Error getting post info from database");
    } else {
      try {
        const comments = await CommentModel.find({ post: post.id });
        const message = `${comments.length} comment${comments.length === 1 ? "" : "s"} found`;
        if (!comments.length) {
          res.status(200).json({
            message,
            comments: null,
          });
        } else {
          res.status(200).json({
            message,
            comments: makeCommentsList(comments),
          });
        }
      } catch (err) {
        res.status(500).json({ message: "Error getting comments", error: err });
      }
    }
  },
);

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
  deleteComment,
  getAllComments,
  getCommentCount,
  postNewComment,
};

export default commentsController;
