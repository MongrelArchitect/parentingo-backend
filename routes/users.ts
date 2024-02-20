import { Router } from "express";

import usersController from "@controllers/usersController";

const usersRoutes = Router();

usersRoutes.post("/", usersController.createNewUser);
usersRoutes.get("/current", usersController.getCurrentUser);

export default usersRoutes;
