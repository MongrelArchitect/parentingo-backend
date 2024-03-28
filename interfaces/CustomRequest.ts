import { Request } from "express";
import { Document } from "mongoose";

import CommentInterface from "./Comments";
import GroupInterface from "./Groups";
import PostInterface from "./Posts";
import UserInterface from "./Users";

export default interface CustomRequest extends Request {
  comment?: Document<unknown, {}, CommentInterface> & CommentInterface;
  group?: Document<unknown, {}, GroupInterface> & GroupInterface;
  post?: Document<unknown, {}, PostInterface> & PostInterface;
  role?: "admin" | "mod";
  userDocument?: Document<unknown, {}, UserInterface> & UserInterface;
}
