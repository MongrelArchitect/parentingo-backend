import { Router } from "express";

const usersRoutes = Router();

usersRoutes.post("/", (req, res) => {
  res.json({
    message: "thanks!",
    body: req.body,
  });
});

export default usersRoutes;
