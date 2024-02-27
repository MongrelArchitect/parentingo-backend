import { model, Schema } from "mongoose";

import GroupInterface from "@interfaces/Groups";

const groupSchema = new Schema<GroupInterface>({
  name: { type: String, required: true },
  admin: { type: String, required: true },
  mods: { type: [String], required: true },
  members: { type: [String], required: true },
});

const GroupModel = model<GroupInterface>("User", groupSchema);

export default GroupModel;
