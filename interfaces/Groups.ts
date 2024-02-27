export default interface GroupInterface {
  name: string;
  admin: string; // id of single user
  mods: string[]; // array of user ids
  members: string[]; // array of user ids
}
