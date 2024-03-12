import { Request } from "express";
import { Document } from "mongoose";
import GroupInterface from "./Groups";
import PostInterface from "./Posts";
import UserInterface from "./Users";

export default interface CustomRequest extends Request {
  group?: Document<unknown, {}, GroupInterface> & GroupInterface;
  post?: Document<unknown, {}, PostInterface> & PostInterface;
  userDocument?: Document<unknown, {}, UserInterface> & UserInterface;
}
