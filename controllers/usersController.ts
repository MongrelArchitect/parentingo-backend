import asyncHandler from "express-async-handler";

const createNewUser = asyncHandler(async (req, res) => {
  res.json({
    message: "thanks!",
    body: req.body,
  });
});

const usersController = {
  createNewUser,
};

export default usersController;
