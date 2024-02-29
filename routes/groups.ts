import { Router } from "express";

import groupsController from "@controllers/groupsController";

const groupsRoutes = Router();

groupsRoutes.get("/owned", groupsController.getOwnedGroups);
groupsRoutes.get("/:groupId", groupsController.getGroupInfo);
groupsRoutes.post("/", groupsController.postNewGroup);

export default groupsRoutes;
