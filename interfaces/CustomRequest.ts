import { Request } from "express";
import { Document } from "mongoose";
import GroupInterface from "./Groups";
import UserInterface from "./Users";

export default interface CustomRequest extends Request {
  group?: Document<unknown, {}, GroupInterface> & GroupInterface;
  userDocument?: Document<unknown, {}, UserInterface> & UserInterface;
}
