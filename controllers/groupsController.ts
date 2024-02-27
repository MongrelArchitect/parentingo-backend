import asyncHandler from "express-async-handler";

const getGroupInfo = [
  asyncHandler(async (req, res) => {
    res.status(401).json({ message: "User authentication required" });
  }),
];

const postNewGroup = [
  asyncHandler(async (req, res) => {
    res.status(401).json({message: "User authentication required" });
  }),
];

const groupsController = {
  getGroupInfo,
  postNewGroup,
};

export default groupsController;
