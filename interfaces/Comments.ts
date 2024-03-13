export default interface CommentInterface {
  id: string;
  author: string; // id of user
  timestamp: Date;
  text: string;
  post: string; // id of post 
}

export interface CommentList {
  [key: string]: CommentInterface;
}
