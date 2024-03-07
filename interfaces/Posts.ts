export default interface PostInterface {
  id: string;
  author: string; // id of user
  timestamp: Date;
  text: string;
  group: string; // id of group
  image?: string;
  comments: string[]; // array of comment ids
  likes: string[]; // array of user ids
}