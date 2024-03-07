import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";

import GroupModel from "@models/group";
import PostModel from "@models/post";

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
      .expect(400, {
        message: "Invalid input - check each field for errors",
        errors: {
          text: {
            type: "field",
            value: "",
            msg: "Text required",
            path: "text",
            location: "body",
          },
        },
      });
  });
});
