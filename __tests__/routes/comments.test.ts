import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";

import CommentModel from "@models/comment";
import GroupModel from "@models/group";
import PostModel from "@models/post";
import UserModel from "@models/user";

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
    // add this user to our group as mod for testing permitted actions
    generalGroup.members.push(noTreason.id);
    generalGroup.mods.push(noTreason.id);
    await generalGroup.save();
  } catch (err) {
    throw new Error("Error adding member to test group");
  }
});

// commentsController.postNewComment
describe("POST /groups/:groupId/posts/:postId/comments/", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .post("/groups/123abc/posts/456def/comments")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .post("/groups/badgroupid/posts/456def/comments")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .post("/groups/601d0b50d91d180dd10d8f7a/posts/456def/comments/")
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
      .post(`/groups/${group.id}/posts/badpostid/comments/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post ", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .post(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/comments/`)
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
      .post(`/groups/${group.id}/posts/${post.id}/comments`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "imbanned is not a member of general group",
      });
  });

  it("successfully creates comment", async () => {
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
      .post(`/groups/${group.id}/posts/${post.id}/comments`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "comment here",
      })
      .expect("Content-Length", "148")
      .expect(201);

    const comments = await CommentModel.find();
    expect(comments.length).toBe(1);
  });

  it("handles missing data", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }

    await supertest(app)
      .post(`/groups/${group.id}/posts/${post.id}/comments`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "",
      })
      .expect("Content-Length", "157")
      .expect(400);

    const comments = await CommentModel.find();
    expect(comments.length).toBe(1);
  });
});

// commentsController.getCommentCount
describe("GET /groups/:groupId/posts/:postId/comments/count", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123abc/posts/456def/comments/count")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .get("/groups/badgroupid/posts/456def/comments/count")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .get("/groups/601d0b50d91d180dd10d8f7a/posts/456def/comments/count")
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
      .get(`/groups/${group.id}/posts/badpostid/comments/count`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/comments/count`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No post found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("responds with comment count", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/${post.id}/comments/count`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: "Post has 1 comment",
        count: 1,
      });
  });
});

// commentsController.getAllComments
describe("GET /groups/:groupId/posts/:postId/comments", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123abc/posts/456def/comments/")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .get("/groups/badgroupid/posts/456def/comments/")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", (done) => {
    supertest(app)
      .get("/groups/601d0b50d91d180dd10d8f7a/posts/456def/comments/")
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
      .get(`/groups/${group.id}/posts/badpostid/comments/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid post id" });
  });

  it("handles nonexistant post", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/601d0b50d91d180dd10d8f7a/comments/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No post found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("gets all post comments", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    await supertest(app)
      .get(`/groups/${group.id}/posts/${post.id}/comments/`)
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Length", "234")
      .expect(200);

    const comments = await CommentModel.find({ post: post.id });
    expect(comments.length).toBe(1);
  });
});

// commentsController.deleteComment
describe("DELETE /groups/:groupId/posts/:postId/comments/:commentId", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .delete("/groups/123abc/posts/456def/comments/789ghi")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .delete("/groups/badgroupid/posts/456def/comments/789ghi")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles invalid comment id", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error getting test group");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/456def/comments/789ghi`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid comment id" });
  });

  it("handles nonexistant comment", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error getting test group");
    }
    await supertest(app)
      .delete(
        `/groups/${group.id}/posts/456def/comments/601d0b50d91d180dd10d8f7a`,
      )
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No comment found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("handles non-admin or mod making the request", async () => {
    // need a non-admin user
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
    const comment = await CommentModel.findOne({});
    if (!comment) {
      throw new Error("Error finding test comment");
    }

    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}/comments/${comment.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Only group admin or mod can make this request",
      });
  });

  it("prevents mod from deleting comment by admin", async () => {
    // need mod user
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

    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    const comment = await CommentModel.findOne({ post: post.id });
    if (!comment) {
      throw new Error("Error finding test comment");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}/comments/${comment.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Mod cannot delete comments by admin or another mod",
      });
  });

  it("allows admin to delete a comment", async () => {
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
    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    const comment = await CommentModel.findOne({ post: post.id });
    if (!comment) {
      throw new Error("Error finding test comment");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}/comments/${comment.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, { message: "Comment deleted" });

    const commentCount = await CommentModel.countDocuments({ post: post.id });
    expect(commentCount).toBe(0);
  });

  it("prevents mod from deleting comment by another mod", async () => {
    // first need mod user
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

    // now make a comment
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const post = await PostModel.findOne({ group: group.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    await supertest(app)
      .post(`/groups/${group.id}/posts/${post.id}/comments`)
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        text: "comment here",
      })
      .expect("Content-Length", "148")
      .expect(201);

    const comments = await CommentModel.find();
    expect(comments.length).toBe(1);

    // now need a different mod user
    const resTwo = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(resTwo.headers["set-cookie"][0].split(";")[0]);

    // now try to delete the other mod's comment
    const comment = await CommentModel.findOne({ post: post.id });
    if (!comment) {
      throw new Error("Error finding test comment");
    }
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}/comments/${comment.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, {
        message: "Mod cannot delete comments by admin or another mod",
      });
  });

  it("allows mod to delete a member's comment", async () => {
    // first demote a mod
    const generalGroup = await GroupModel.findOne({ name: "general" });
    if (!generalGroup) {
      throw new Error("Error getting test group");
    }
    const modUser = await UserModel.findOne({ username: "moddy" });
    if (!modUser) {
      throw new Error("Error getting test user");
    }
    try {
      // add this user to our group as mod for testing permitted actions
      generalGroup.mods.splice(generalGroup.mods.indexOf(modUser.id), 1);
      await generalGroup.save();
    } catch (err) {
      throw new Error("Error demoting test user");
    }

    // now try to delete the demoted member's comment
    const post = await PostModel.findOne({ group: generalGroup.id });
    if (!post) {
      throw new Error("Error finding test post");
    }
    const comment = await CommentModel.findOne({ post: post.id });
    if (!comment) {
      throw new Error("Error finding test comment");
    }
    await supertest(app)
      .delete(
        `/groups/${generalGroup.id}/posts/${post.id}/comments/${comment.id}`,
      )
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: "Comment deleted",
      });

    const commentCount = await CommentModel.countDocuments({ post: post.id });
    expect(commentCount).toBe(0);
  });
});
