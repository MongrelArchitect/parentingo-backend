import { model, Schema } from "mongoose";

import CommentInterface from "@interfaces/Comments";

const commentSchema = new Schema<CommentInterface>({
  id: { type: String, required: true, unique: true },
  author: { type: String, required: true },
  timestamp: {type: Date, required: true},
  text: {type: String, required: true},
  post: {type: String, required: true},
});

const CommentModel = model<CommentInterface>("Comment", commentSchema);

export default CommentModel;
