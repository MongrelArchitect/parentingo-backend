export default interface UserInterface {
  avatar?: string;
  bio?: string;
  created: Date;
  email: string; // unique, 255 chars max
  followers: string[];
  following: string[];
  id: string;
  lastLogin: Date;
  name: string; // 255 chars max
  password: string; // 8 chars min, 1 upper, 1 lower, 1 number, 1 symbol
  username: string; // unique, between 3-20 characters
}
