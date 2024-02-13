import { Router } from "express";

import usersController from "@controllers/usersController";

const usersRoutes = Router();

usersRoutes.post("/", usersController.createNewUser);

export default usersRoutes;
