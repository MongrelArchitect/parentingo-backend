export default interface PostInterface {
  id: string;
  author: string; // id of user
  timestamp: Date;
  text: string;
  title: string;
  group: string; // id of group
  image?: string;
  likes: string[]; // array of user ids
}

export interface PostList {
  [key: string]: PostInterface;
}
