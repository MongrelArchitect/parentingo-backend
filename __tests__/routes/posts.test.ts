import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";

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
});

describe("POST /groups/:groupId/posts", () => {
  // XXX TODO XXX
  // need to test images...
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
});

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
      .expect("Content-Length", "548")
      .expect(200);
  });
});

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
      .expect(200, { message: "2 posts found", count: 2 });
  });
});

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

  it("handles non-admin making the request", async () => {
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
      .expect(403, { message: "Only group admin can delete posts" });
  });

  it("deletes post", async () => {
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
    await supertest(app)
      .delete(`/groups/${group.id}/posts/${post.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, { message: "Post deleted" });

    const postCount = await PostModel.countDocuments({ group: group.id });
    expect(postCount).toBe(1);
  });
});
