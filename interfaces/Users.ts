export default interface UserInterface {
  email: string;
  password: string;
  name: string;
  username: string;
  followers: string[];
  following: string[];
  avatar?: string;
  lastLogin: Date;
}
