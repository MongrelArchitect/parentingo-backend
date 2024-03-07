import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import CustomRequest from "@interfaces/CustomRequest";

import PostModel from "@models/post";
import PostInterface from "@interfaces/Posts";
import UserInterface from "@interfaces/Users";

// POST to submit a new post
const postNewPost = [
  body("text")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Text required")
    .isLength({ min: 1, max: 50000 })
    .withMessage("Post cannot be more than 50,000 characters"),

  // XXX TODO XXX
  // need to handle images

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
    const { group, user } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else if (!user) {
      throw new Error("Error deserializing authenticated user's info");
    } else {
      try {
        const data = matchedData(req);
        const userInfo = user as UserInterface;
        const postInfo: PostInterface = {
          id: "",
          author: userInfo.id,
          timestamp: new Date(),
          group: group.id,
          text: data.text,
          comments: [],
          likes: [],
        };
        const newPost = new PostModel(postInfo);
        newPost.id = newPost._id.toString();
        await newPost.save();
        res
          .status(201)
          .json({
            message: `New post added to ${group.name} group`,
            id: newPost.id,
            uri: `groups/${group.id}/posts/${newPost.id}`,
          });
      } catch (err) {
        res.status(500).json({ message: "Error adding new post", error: err });
      }
    }
  }),
];

const postsController = {
  postNewPost,
};

export default postsController;
