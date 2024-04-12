import { NextFunction, Response } from "express";
import asyncHandler from "express-async-handler";
import { body, matchedData, validationResult } from "express-validator";
import { getDownloadURL } from "firebase-admin/storage";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";

import { storageBucket } from "@configs/firebase";

import CustomRequest from "@interfaces/CustomRequest";
import PostInterface from "@interfaces/Posts";
import UserInterface from "@interfaces/Users";

import CommentModel from "@models/comment";
import PostModel from "@models/post";

import { makePostList } from "@util/posts";

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
        // delete the post itself, its image & any of its comments
        await PostModel.findByIdAndDelete(post.id);
        if (post.image) {
          await storageBucket.file(`posts/${post.id}-image.webp`).delete();
        }
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
        // structure our query with any optional parameters
        const { limit, skip, sort } = req.query;
        let query = PostModel.find({ group: group.id });
        if (sort && sort === "newest") {
          query = query.sort("-timestamp");
        }
        if (skip && !isNaN(+skip)) {
          query = query.skip(+skip);
        }
        if (limit && !isNaN(+limit)) {
          query = query.limit(+limit);
        }

        const posts = await query;

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

// for handling post image uploads
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../tmp/posts"));
  },
});

const upload = multer({
  storage: imageStorage,
  limits: {
    // 10 MB
    fileSize: 10000000,
    files: 1,
    fields: 2,
  },
});

// use if there's any errors or once we've uplodaed to cloud storage
const deleteTempImage = (filePath: string) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      throw new Error(err.toString());
    }
  });
};

// POST to submit a new post
const postNewPost = [
  upload.single("image"),

  (err: Error, req: CustomRequest, res: Response, next: NextFunction) => {
    if (err) {
      res.status(413).json({ message: "File too large (10MB max)" });
    } else {
      next();
    }
  },

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
      // need to delete any uploaded file since we won't be using it
      if (req.file) {
        deleteTempImage(req.file.path);
      }
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
    if ((!group || !user) && req.file) {
      // need to delete any uploaded file since we won't be using it
      deleteTempImage(req.file.path);
    }
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

        // handle image
        if (req.file) {
          // set all the paths we need
          const resizedFilename = `${newPost.id}-image.webp`;
          const resizedPath = path.join(
            __dirname,
            `../tmp/posts/resized/${resizedFilename}`,
          );
          const storageDestination = `posts/${resizedFilename}`;

          // resize & convert to webp format (old browsers be damned)
          await sharp(req.file.path)
            .webp({ quality: 90 })
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .toFile(resizedPath);

          // upload to firebase
          await storageBucket.upload(resizedPath, {
            destination: storageDestination,
          });

          // delete both temp images
          deleteTempImage(req.file.path);
          deleteTempImage(resizedPath);

          // get the download URL to add to the new post's "image" field
          const fileRef = storageBucket.file(storageDestination);
          const downloadURL = await getDownloadURL(fileRef);
          newPost.image = downloadURL;
        }

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
