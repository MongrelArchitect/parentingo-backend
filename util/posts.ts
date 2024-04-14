import { Document } from "mongoose";

import PostInterface, { PostList } from "@interfaces/Posts";

export function makePostList(posts: Document[]): PostList {
  // could just return the raw array, but i want it a bit cleaner...
  const list: PostList = {};
  posts.forEach((post) => {
    // XXX
    // better way to do this?
    const postInfo = post as unknown as PostInterface;
    list[postInfo.id] = {
      id: postInfo.id,
      author: postInfo.author,
      timestamp: postInfo.timestamp,
      text: postInfo.text,
      title: postInfo.title,
      group: postInfo.group,
      image: postInfo.image,
      likes: postInfo.likes,
      sticky: postInfo.sticky,
    };
  });
  return list;
}
