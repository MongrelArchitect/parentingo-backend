import asyncHandler from "express-async-handler";

const getGroupInfo = [
  asyncHandler(async (req, res) => {
    res.status(401).json({ message: "User authentication required" });
  }),
];

const postNewGroup = [
  asyncHandler(async (req, res, next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).json({ message: "User authentication required" });
    }
  }),

  asyncHandler(async (req, res) => {
    res.status(200).json({ message: "whoopsie daisy" });
  }),
];

const groupsController = {
  getGroupInfo,
  postNewGroup,
};

export default groupsController;
