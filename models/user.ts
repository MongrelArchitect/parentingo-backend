import { model, Schema } from "mongoose";

import UserInterface from "@interfaces/Users";

const userSchema = new Schema<UserInterface>({
  email: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true },
  followers: { type: [String], required: true },
  following: { type: [String], required: true },
  avatar: String,
  lastLogin: { type: Date, required: true },
});

const UserModel = model<UserInterface>("User", userSchema);

export default UserModel;
