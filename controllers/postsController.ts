import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import { Document } from "mongoose";

import CustomRequest from "@interfaces/CustomRequest";
import PostInterface, { PostList } from "@interfaces/Posts";
import UserInterface from "@interfaces/Users";

import CommentModel from "@models/comment";
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
      title: postInfo.title,
      group: postInfo.group,
      image: postInfo.image,
      likes: postInfo.likes,
    };
  });
  return list;
}

// DELETE a single post
const deletePost = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { group, post, role, user } = req;
  if (!group) {
    throw new Error("Error getting group info from database");
  } else if (!post) {
    throw new Error("Error getting post info from database");
  } else if (!role) {
    throw new Error("Error setting authenticated user's role");
  } else if (!user) {
    throw new Error("Error deserializing authenticated user's info");
  } else {
    const authUser = user as UserInterface;

    const userIsMod = role === "mod";
    const authorIsAdmin = group.admin === post.author;
    const authorIsMod = group.mods.includes(post.author);
    const isOwnPost = post.author === authUser.id;

    if (
      // mod cannot delete an admin's post
      (userIsMod && authorIsAdmin) ||
      // mod cannot delete a mod's post (except their own)
      (userIsMod && authorIsMod && !isOwnPost)
    ) {
      res
        .status(403)
        .json({ message: "Mod cannot delete posts by admin or another mod" });
    } else {
      try {
        // delete the post itself, then any of its comments
        await PostModel.findByIdAndDelete(post.id);
        await CommentModel.deleteMany({ post: post.id });
        res.status(200).json({ message: "Post deleted" });
      } catch (err) {
        res.status(500).json({
          message: "Error deleting post",
          error: err,
        });
      }
    }
  }
});

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

// GET a count of all posts in a group
const getPostCount = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { group } = req;
  if (!group) {
    throw new Error("Error getting group info from database");
  } else {
    try {
      const count = await PostModel.countDocuments({ group: group.id });
      res.status(200).json({
        message: `${count} post${count === 1 ? "" : "s"} found`,
        count,
      });
    } catch (err) {
      res.status(500).json({ message: "Error getting post count", error: err });
    }
  }
});

// GET a single post
const getSinglePost = asyncHandler(async (req: CustomRequest, res) => {
  const { post } = req;
  if (!post) {
    throw new Error("Error getting post info from database");
  } else {
    res.status(200).json({
      message: "Post found",
      post,
    });
  }
});

// PATCH to "like" a post
const patchLikePost = asyncHandler(async (req: CustomRequest, res) => {
  const { post, user } = req;
  if (!user) {
    throw new Error("Error deserializing user info");
  } else if (!post) {
    throw new Error("Error getting post from database");
  } else {
    try {
      const userInfo = user as UserInterface;
      if (post.likes.includes(userInfo.id)) {
        res.status(403).json({
          message: "Can only like a post once",
        });
      } else {
        post.likes.push(userInfo.id);
        await post.save();
        res.status(200).json({
          message: "Post liked",
        });
      }
    } catch (err) {
      res.status(500).json({ message: "Error liking post", error: err });
    }
  }
});

// PATCH to "unlike" a post
const patchUnlikePost = asyncHandler(async (req: CustomRequest, res) => {
  const { post, user } = req;
  if (!user) {
    throw new Error("Error deserializing user info");
  } else if (!post) {
    throw new Error("Error getting post from database");
  } else {
    try {
      const userInfo = user as UserInterface;
      if (!post.likes.includes(userInfo.id)) {
        res.status(403).json({
          message: "Post not liked",
        });
      } else {
        post.likes.splice(post.likes.indexOf(userInfo.id), 1);
        await post.save();
        res.status(200).json({
          message: "Post unliked",
        });
      }
    } catch (err) {
      res.status(500).json({ message: "Error unliking post", error: err });
    }
  }
});

// POST to submit a new post
const postNewPost = [
  body("title")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Ttitle required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Post cannot be more than 255 characters"),

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
          title: data.title,
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
  deletePost,
  getGroupPosts,
  getPostCount,
  getSinglePost,
  patchLikePost,
  patchUnlikePost,
  postNewPost,
};

export default postsController;
