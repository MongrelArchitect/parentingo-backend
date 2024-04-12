import path from "path";
import supertest from "supertest";

import app from "../../app";
import cookieControl from "../config/session";

import CommentModel from "@models/comment";
import GroupModel from "@models/group";
import PostModel from "@models/post";
import UserModel from "@models/user";

let postId = "";

beforeAll(async () => {
  // need a user
  const res = await supertest(app)
    .post("/users/login")
    .type("form")
    .send({
      username: "praxman",
      password: "HumanAction123$",
    })
    .expect("Content-Type", /json/)
    .expect(200);
  // save cookie for future tests that require this user's session
  cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

  const noTreason = await UserModel.findOne({ username: "notreason" });
  if (!noTreason) {
    throw new Error("Error getting test user");
  }
  const generalGroup = await GroupModel.findOne({ name: "general" });
  if (!generalGroup) {
    throw new Error("Error getting test group");
  }
  try {
    generalGroup.members.push(noTreason.id);
    await generalGroup.save();
  } catch (err) {
    throw new Error("Error adding member to test group");
  }
});

// postsController.postNewPost
describe("POST /groups/:groupId/posts", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .post("/groups/123abc/posts")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .post("/groups/badgroupid/posts")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .post("/groups/601d0b50d91d180dd10d8f7a/posts/")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("handles non group member", async () => {
    // need a user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "imbanned",
        password: "ImBanned123#",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "imbanned is not a member of general group",
      });
  });

  it("successfully creates post", async () => {
    // need a member (this one happens to be admin)
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const resTwo = await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "this is the post",
        title: "my title",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    postId = resTwo.body.id;
    const post = await PostModel.findById(postId);
    expect(post).toBeTruthy();
  });

  it("handles missing data", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "",
      })
      .expect("Content-Type", /json/)
      .expect("Content-Length", "250")
      .expect(400);
  });

  it("handles files that are too large", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const imagePath = path.join(__dirname, "../files/big.png");
    await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .attach("image", imagePath)
      .field({
        text: "this post has an image",
        title: "image post",
      })
      .expect("Content-Type", /json/)
      .expect(413, { message: "File too large (10MB max)" });
  });

  it("handles post with image", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const imagePath = path.join(__dirname, "../files/small.jpg");
    const resTwo = await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .attach("image", imagePath)
      .field({
        text: "this post has an image",
        title: "image post",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    postId = resTwo.body.id;
    const post = await PostModel.findById(postId);
    if (!post || !post.image) {
      throw new Error("Error getting post with image");
    }
    expect(post && post.image).toBeTruthy();
    const imageFetch = await fetch(post.image);
    expect(imageFetch.status).toBe(200);
  });
});

// postsController.getGroupPosts
describe("GET /groups/:groupId/posts/", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123abc/posts")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .get("/groups/badgroupid/posts")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .get("/groups/601d0b50d91d180dd10d8f7a/posts/")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("gets all group posts", async () => {
    const group = await GroupModel.findOne({ name: "general" });

    if (!group) {
      throw new Error("Error finding test group");
    }

    await supertest(app)
      .get(`/groups/${group.id}/posts`)
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Length", "942")
      .expect(200);

    // 3 posts by this point
    const count = await PostModel.countDocuments({ group: group.id });
    expect(count).toBe(3);
  });

  it("handles url query parameters", async () => {
    const group = await GroupModel.findOne({ name: "general" });

    if (!group) {
      throw new Error("Error finding test group");
    }

    const response = await supertest(app)
      .get(`/groups/${group.id}/posts?sort=newest&skip=2&limit=1`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200);

    // make sure we've got the right post
    const { posts } = response.body;
    const postId = Object.keys(posts)[0];
    expect(Object.keys(posts).length).toBe(1);
    expect(posts[postId].title).toBe("Praxeology Rules");
  });
});

// postsController.getSinglePost
describe("GET /groups/:groupId/posts/:postId", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123abc/posts")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .get("/groups/badgroupid/posts")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .get("/groups/601d0b50d91d180dd10d8f7a/posts/")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("handles invalid post id", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/badpostid`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post ", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No post found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("reponds with post info", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne();
    if (!post) {
      throw new Error("Error finding test post");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/${post.id}/`)
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Length", "329")
      .expect(200);
  });
});

// postsController.patchLikePost
describe("PATCH /groups/:groupId/posts/:postId/like", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .patch("/groups/123abc/posts/badpostid/like")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .patch("/groups/badgroupid/posts/badpostid/like")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .patch("/groups/601d0b50d91d180dd10d8f7a/posts/badpostid/like")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("handles invalid post id", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/posts/badpostid/like`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post ", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/like`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No post found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("handles non group member", async () => {
    // need a user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "imbanned",
        password: "ImBanned123#",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .patch(`/groups/${group.id}/posts/${post.id}/like`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "imbanned is not a member of general group",
      });
  });

  it("handles group member", async () => {
    // need a user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .patch(`/groups/${group.id}/posts/${post.id}/like`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: "Post liked",
      });
  });

  it("forbids user from liking post multiple times", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .patch(`/groups/${group.id}/posts/${post.id}/like`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Can only like a post once",
      });
  });

  it("has the correct likes", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    const user = await UserModel.findOne({ username: "praxman" });
    if (!user) {
      throw new Error("Error finding test user");
    }

    expect(post.likes.length).toBe(1);
    expect(post.likes.includes(user.id)).toBeTruthy();
  });
});

// postsController.patchUnlikePost
describe("PATCH /groups/:groupId/posts/:postId/unlike", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .patch("/groups/123abc/posts/badpostid/unlike")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .patch("/groups/badgroupid/posts/badpostid/unlike")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .patch("/groups/601d0b50d91d180dd10d8f7a/posts/badpostid/unlike")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("handles invalid post id", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/posts/badpostid/unlike`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post ", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/unlike`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No post found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("handles non group member", async () => {
    // need a user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "imbanned",
        password: "ImBanned123#",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .patch(`/groups/${group.id}/posts/${post.id}/unlike`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "imbanned is not a member of general group",
      });
  });

  it("handles group member", async () => {
    // need a user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .patch(`/groups/${group.id}/posts/${post.id}/unlike`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: "Post unliked",
      });
  });

  it("only unlikes a liked post", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .patch(`/groups/${group.id}/posts/${post.id}/unlike`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Post not liked",
      });
  });

  it("has the correct likes", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    const user = await UserModel.findOne({ username: "praxman" });
    if (!user) {
      throw new Error("Error finding test user");
    }

    expect(post.likes.length).toBe(0);
    expect(post.likes.includes(user.id)).toBeFalsy();
  });
});

// postsController.getPostCount
describe("GET /groups/:groupId/posts/count", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123abc/posts/count")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .get("/groups/badgroupid/posts/count")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .get("/groups/601d0b50d91d180dd10d8f7a/posts/count")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("gets post count", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/count`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, { message: "3 posts found", count: 3 });
  });
});

// postsController.deletePost
describe("DELETE /groups/:groupId/posts/:postId", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .delete("/groups/123abc/posts/badpostid/")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .delete("/groups/badgroupid/posts/badpostid/")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .delete("/groups/601d0b50d91d180dd10d8f7a/posts/badpostid/")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        {
          message: "No group found with id 601d0b50d91d180dd10d8f7a",
        },
        done,
      );
  });

  it("handles invalid post id", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/badpostid/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post ", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No post found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("handles non-admin or non-mod making the request", async () => {
    // need a non-admin user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Only group admin or mod can make this request",
      });
  });

  it("deletes post and its comments", async () => {
    // need admin user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne({
      group: group.id,
      image: { $exists: true },
    });
    if (!post) {
      throw new Error("Error finding test post");
    }

    // give our test post some comments
    await supertest(app)
      .post(`/groups/${group.id}/posts/${post.id}/comments`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "here is a comment",
      })
      .expect(201);
    await supertest(app)
      .post(`/groups/${group.id}/posts/${post.id}/comments`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "another comment goes here",
      })
      .expect(201);
    const commentCountBefore = await CommentModel.countDocuments({
      post: post.id,
    });
    expect(commentCountBefore).toBe(2);

    // delete the post
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, { message: "Post deleted" });

    // make sure our group now has correct number of posts
    const postCount = await PostModel.countDocuments({ group: group.id });
    expect(postCount).toBe(2);

    // make sure the image was deleted
    if (!post.image) {
      throw new Error("Error with test post image");
    }
    const fetchResponse = await fetch(post.image);
    expect(fetchResponse.status).toBe(404);

    // make sure the post comment was also deleted
    const commentCountAfter = await CommentModel.countDocuments({
      post: post.id,
    });
    expect(commentCountAfter).toBe(0);
  });

  it("prevents mod from deleting admin's post", async () => {
    // first make a post by admin
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const result = await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "this is the post",
        title: "my post",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    postId = result.body.id;
    const post = await PostModel.findById(postId);
    expect(post).toBeTruthy();

    // then login as mod
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "moddy",
        password: "ImAMod123#",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    // now try deleting the admin's post
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${postId}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Mod cannot delete posts by admin or another mod",
      });
  });

  it("prevents mod from deleting another mod's post", async () => {
    // first make a post by our logged-in mod
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const result = await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "post by a mod",
        title: "mod post",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    postId = result.body.id;
    const post = await PostModel.findById(postId);
    expect(post).toBeTruthy();

    // now we need to promote another member to mod
    const noTreason = await UserModel.findOne({ username: "notreason" });
    if (!noTreason) {
      throw new Error("Error getting test user");
    }
    try {
      group.mods.push(noTreason.id);
      await group.save();
    } catch (err) {
      throw new Error("Error promoting test member to mod of test group");
    }

    // then login as that newly promoted mod
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    // now try deleting the other mod's post
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${postId}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Mod cannot delete posts by admin or another mod",
      });
  });

  it("allows mod to delete a member's post", async () => {
    // first let's demote a mod to member
    const noTreason = await UserModel.findOne({ username: "notreason" });
    if (!noTreason) {
      throw new Error("Error getting test user");
    }
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    try {
      group.mods.splice(group.mods.indexOf(noTreason.id), 1);
      await group.save();
    } catch (err) {
      throw new Error("Error demoting test mod");
    }

    // we're still logged in as this newly demoted member, so make a post
    const result = await supertest(app)
      .post(`/groups/${group.id}/posts/`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "post by a member",
        title: "member post",
      })
      .expect("Content-Type", /json/)
      .expect(201);

    postId = result.body.id;
    const post = await PostModel.findById(postId);
    expect(post).toBeTruthy();

    // then login as another mod
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "moddy",
        password: "ImAMod123#",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    // now try deleting the post
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${postId}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: "Post deleted",
      });
  });
});
