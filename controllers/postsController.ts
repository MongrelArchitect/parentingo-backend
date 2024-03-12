import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import { Document } from "mongoose";

import CustomRequest from "@interfaces/CustomRequest";
import PostInterface, { PostList } from "@interfaces/Posts";
import UserInterface from "@interfaces/Users";

import PostModel from "@models/post";

function makePostList(posts: Document[]): PostList {
  // could just return the raw array, but i want it a bit cleaner...
  const list: PostList = {};
  posts.forEach((post) => {
    // XXX
    // better way to do this?
    const postInfo = post as unknown as PostInterface;
    list[postInfo.id] = {
      id: postInfo.id,
      author: postInfo.author,
      timestamp: postInfo.timestamp,
      text: postInfo.text,
      group: postInfo.group,
      image: postInfo.image,
      comments: postInfo.comments,
      likes: postInfo.likes,
    };
  });
  return list;
}

// GET all posts from a specific group
const getGroupPosts = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const { group } = req;
    if (!group) {
      throw new Error("Error getting group info from database");
    } else {
      try {
        const posts = await PostModel.find({ group: group.id });
        if (!posts.length) {
          res.status(200).json({
            message: "No posts found",
            posts: null,
          });
        } else {
          res.status(200).json({
            message: `${posts.length} post${posts.length > 1 ? "s" : ""} found`,
            posts: makePostList(posts),
          });
        }
      } catch (err) {
        res.status(500).json({
          message: "Error finding group posts",
          error: err,
        });
      }
    }
  },
);

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
        res.status(201).json({
          message: `New post added to ${group.name} group`,
          id: newPost.id,
          uri: `/groups/${group.id}/posts/${newPost.id}`,
        });
      } catch (err) {
        res.status(500).json({ message: "Error adding new post", error: err });
      }
    }
  }),
];

const postsController = {
  getGroupPosts,
  postNewPost,
};

export default postsController;
