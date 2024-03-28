import bcrypt from "bcrypt";
import mongoose from "mongoose";
import GroupModel from "@models/group";
import GroupInterface from "@interfaces/Groups";
import PostInterface from "@interfaces/Posts";
import PostModel from "@models/post";
import UserInterface from "@interfaces/Users";
import UserModel from "@models/user";

beforeAll(async () => {
  // only if testing uri was successfully created in setup
  if (process.env.MONGO_TESTING_URI) {
    await mongoose.connect(process.env["MONGO_TESTING_URI"]);
    // add a user so we can test group operations
    const hashedPass = await bcrypt.hash("HumanAction123$", 10);
    const userInfo: UserInterface = {
      email: "ludwig@mises.org",
      followers: [],
      following: [],
      id: "",
      lastLogin: new Date(),
      password: hashedPass,
      name: "Ludwig von Mises",
      username: "praxman",
    };
    const newUser = new UserModel(userInfo);
    newUser.id = newUser._id.toString();
    await newUser.save();

    // add another user to test group operations
    const userPass = await bcrypt.hash("NoAuthority68!", 10);
    const secondUserInfo: UserInterface = {
      email: "lysander@mises.org",
      followers: [],
      following: [],
      id: "",
      lastLogin: new Date(),
      password: userPass,
      name: "Lysander Spooner",
      username: "notreason",
    };
    const secondUser = new UserModel(secondUserInfo);
    secondUser.id = secondUser._id.toString();
    await secondUser.save();

    // add a user that will be banned from the "general" group
    const bannedPass = await bcrypt.hash("ImBanned123#", 10);
    const bannedInfo: UserInterface = {
      email: "bad@banned.com",
      followers: [],
      following: [],
      id: "",
      lastLogin: new Date(),
      password: bannedPass,
      name: "Bad Actor",
      username: "imbanned",
    };
    const bannedUser = new UserModel(bannedInfo);
    bannedUser.id = bannedUser._id.toString();
    await bannedUser.save();

    // add a user that will be a mod of the "general" group
    const modPass = await bcrypt.hash("ImAMod123#", 10);
    const modInfo: UserInterface = {
      email: "mod@mod.com",
      followers: [],
      following: [],
      id: "",
      lastLogin: new Date(),
      password: modPass,
      name: "Ima Mod",
      username: "moddy",
    };
    const modUser = new UserModel(modInfo);
    modUser.id = modUser._id.toString();
    await modUser.save();

    // add a "general" group for which "praxman" is the admin & "moddy" is a mod
    const groupInfo: GroupInterface = {
      name: "general",
      description: "For general discussion about anything and everything",
      admin: newUser.id,
      mods: [modUser.id],
      members: [newUser.id, modUser.id],
      id: "",
      banned: [bannedUser.id],
    };
    const newGroup = new GroupModel(groupInfo);
    newGroup.id = newGroup._id.toString();
    await newGroup.save();

    // add a post to our general group
    const postInfo: PostInterface = {
      id: "",
      author: newUser.id,
      timestamp: new Date(),
      text: "Human action is what drives the economy, and value is subjective.",
      title: "Praxeology Rules",
      group: newGroup.id,
      likes: [],
    };
    const newPost = new PostModel(postInfo);
    newPost.id = newPost._id.toString();
    await newPost.save();
  }
});

afterAll(async () => {
  // only if testing uri was successfully created in setup
  if (process.env.MONGO_TESTING_URI) {
    await UserModel.deleteMany({});
    await GroupModel.deleteMany({});
    await mongoose.disconnect();
  }
});
