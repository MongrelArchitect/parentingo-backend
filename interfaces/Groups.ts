export default interface GroupInterface {
  name: string; // 255 characters max
  description: string; // 255 characters max
  id: string;
  admin: string; // id of single user
  mods: string[]; // array of user ids
  members: string[]; // array of user ids
  banned: string[]; // array of user ids that will be blocked from joining
}

export interface GroupList {
  [key: string]: GroupInterface;
}
