import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";

import CommentModel from "@models/comment";
import GroupModel from "@models/group";
import PostModel from "@models/post";

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
      .expect(200);

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
    const post = await PostModel.findOne({group:group.id});
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
