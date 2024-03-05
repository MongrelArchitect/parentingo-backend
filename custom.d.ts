import GroupInterface from "@interfaces/Groups"

declare namespace Express {
   export interface Request {
     group?: GroupInterface;
   }
}
