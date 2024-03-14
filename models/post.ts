import { model, Schema } from "mongoose";

import PostInterface from "@interfaces/Posts";

const postSchema = new Schema<PostInterface>({
  id: { type: String, required: true, unique: true },
  author: { type: String, required: true },
  timestamp: {type: Date, required: true},
  text: {type: String, required: true},
  title: {type: String, required: true},
  group: {type: String, required: true},
  image: String,
  likes: {type: [String], requird: true},
});

const PostModel = model<PostInterface>("Post", postSchema);

export default PostModel;
