import { model, Schema } from "mongoose";

import UserInterface from "@interfaces/Users";

const userSchema = new Schema<UserInterface>({
  created: { type: Date, required: true },
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  followers: { type: [String], required: true },
  following: { type: [String], required: true },
  avatar: String,
  bio: String,
  lastLogin: { type: Date, required: true },
});

const UserModel = model<UserInterface>("User", userSchema);

export default UserModel;
