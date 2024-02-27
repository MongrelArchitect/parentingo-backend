import mongoose from "mongoose";
import GroupModel from "@models/group";
import GroupInterface from "@interfaces/Groups";
import UserInterface from "@interfaces/Users";
import UserModel from "@models/user";

beforeAll(async () => {
  // only if testing uri was successfully created in setup
  if (process.env.MONGO_TESTING_URI) {
    await mongoose.connect(process.env["MONGO_TESTING_URI"]);
    // add a user so we can test group operations
    const userInfo: UserInterface = {
      email: "ludwig@mises.org",
      followers: [],
      following: [],
      id: "",
      lastLogin: new Date(),
      password: "HumanAction123$",
      name: "Ludwig von Mises",
      username: "praxman",
    };
    const newUser = new UserModel(userInfo);
    newUser.id = newUser._id.toString();
    await newUser.save();

    // add the "general" group that all new users are added to
    const groupInfo: GroupInterface = {
      name: "general",
      admin: newUser.id,
      mods: [newUser.id],
      members: [newUser.id],
    };
    const newGroup = new GroupModel(groupInfo);
    await newGroup.save();
  }
});

afterAll(async () => {
  // only if testing uri was successfully created in setup
  if (process.env.MONGO_TESTING_URI) {
    await mongoose.disconnect();
  }
});
