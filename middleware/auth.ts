import { NextFunction, Request, Response } from "express";

function isAuthenticated(req: Request, res:Response, next:NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "User authentication required" });
  } else {
    next();
  }
}

const auth = {
  isAuthenticated,
};

export default auth;
