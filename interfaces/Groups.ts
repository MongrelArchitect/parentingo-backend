export default interface GroupInterface {
  name: string; // 255 characters max
  admin: string; // id of single user
  mods: string[]; // array of user ids
  members: string[]; // array of user ids
}
