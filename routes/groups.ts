import { Router } from "express";

import groupsController from "@controllers/groupsController";

const groupsRoutes = Router();

groupsRoutes.get("/:groupId", groupsController.getGroupInfo);
groupsRoutes.post("/", groupsController.postNewGroup);

export default groupsRoutes;
