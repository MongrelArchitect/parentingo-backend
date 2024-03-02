import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";
import GroupModel from "@models/group";
import UserModel from "@models/user";

function getLongString(num: number) {
  let string = "";
  for (let i = 0; i < num; i += 1) {
    string += "a";
  }
  return string;
}

const groupsTests = [
  () =>
    describe("GET /groups/owned", () => {
      it("handles unauthenticated user", (done) => {
        supertest(app)
          .get("/groups/owned")
          .expect("Content-Type", /json/)
          .expect(401, { message: "User authentication required" }, done);
      });

      it("handles user with no owned groups", (done) => {
        supertest(app)
          .get("/groups/owned")
          .set("Cookie", cookieControl.getCookie())
          .expect("Content-Type", /json/)
          .expect(200, { message: "No owned groups found" }, done);
      });

      it("handles user with owned groups", async () => {
        const res = await supertest(app)
          .post("/users/login")
          .type("form")
          .send({
            // user from setup file that owns the "general" group
            username: "praxman",
            password: "HumanAction123$",
          })
          .expect("Content-Type", /json/)
          .expect(200);
        // save cookie for future tests that require this user's session
        cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

        await supertest(app)
          .get("/groups/owned")
          .set("Cookie", cookieControl.getCookie())
          .expect("Content-Type", /json/)
          .expect("Content-Length", "299")
          .expect(200);
      });
    }),

  () =>
    // XXX
    describe("GET /groups/:groupId", () => {
      it("handles unauthenticated user", (done) => {
        supertest(app)
          .get("/groups/123")
          .expect("Content-Type", /json/)
          .expect(401, { message: "User authentication required" }, done);
      });
    }),

  () =>
    describe("POST /groups", () => {
      it("handles unauthenticated user", (done) => {
        supertest(app)
          .post("/groups/")
          .expect("Content-Type", /json/)
          .expect(401, { message: "User authentication required" }, done);
      });

      it("handles missing data", (done) => {
        supertest(app)
          .post("/groups")
          .set("Cookie", cookieControl.getCookie())
          .type("form")
          .send({
            name: "",
            description: "",
          })
          .expect("Content-Type", /json/)
          .expect(
            400,
            {
              message: "Invalid input - check each field for errors",
              errors: {
                name: {
                  type: "field",
                  value: "",
                  msg: "Name required",
                  path: "name",
                  location: "body",
                },
                description: {
                  type: "field",
                  value: "",
                  msg: "Description required",
                  path: "description",
                  location: "body",
                },
              },
            },
            done,
          );
      });

      it("handles invalid data", (done) => {
        supertest(app)
          .post("/groups")
          .set("Cookie", cookieControl.getCookie())
          .type("form")
          .send({
            name: getLongString(256),
            description: getLongString(256),
          })
          .expect("Content-Type", /json/)
          .expect(
            400,
            {
              message: "Invalid input - check each field for errors",
              errors: {
                name: {
                  type: "field",
                  value: getLongString(256),
                  msg: "Name cannot be more than 255 characters",
                  path: "name",
                  location: "body",
                },
                description: {
                  type: "field",
                  value: getLongString(256),
                  msg: "Description cannot be more than 255 characters",
                  path: "description",
                  location: "body",
                },
              },
            },
            done,
          );
      });

      it("creates new group", (done) => {
        supertest(app)
          .post("/groups")
          .set("Cookie", cookieControl.getCookie())
          .type("form")
          .send({
            name: "test group",
            description: "this is just a test",
          })
          .expect("Content-Type", /json/)
          .expect("Content-Length", "224")
          .expect(201, done);
      });

      it("handles existing group name", (done) => {
        supertest(app)
          .post("/groups")
          .set("Cookie", cookieControl.getCookie())
          .type("form")
          .send({
            name: "test group",
            description: "this is just a test",
          })
          .expect("Content-Type", /json/)
          .expect(
            400,
            {
              message: "Invalid input - check each field for errors",
              errors: {
                name: {
                  type: "field",
                  value: "test group",
                  msg: "Group with that name already exists",
                  path: "name",
                  location: "body",
                },
              },
            },
            done,
          );
      });
    }),

  () => {
    describe("PATCH /groups/:groupId/members", () => {
      it("handles unauthenticated user", async () => {
        const group = await GroupModel.findOne({ name: "general" });
        if (!group) {
          throw new Error("Error finding test group");
        }
        await supertest(app)
          .patch(`/groups/${group.id}/members`)
          .expect(401, { message: "User authentication required" });
      });

      it("handles invalid group id", (done) => {
        supertest(app)
          .patch("/groups/badid123/members")
          .set("Cookie", cookieControl.getCookie())
          .expect(400, { message: "Invalid group id" }, done);
      });

      it("handles valid but nonexistant group id", (done) => {
        supertest(app)
          .patch("/groups/601d0b50d91d180dd10d8f7a/members")
          .set("Cookie", cookieControl.getCookie())
          .expect(
            404,
            { message: 'No group found with id "601d0b50d91d180dd10d8f7a"' },
            done,
          );
      });

      it("handles authenticated user", async () => {
        // first we need a user that isn't already in the group
        const res = await supertest(app)
          .post("/users/login")
          .type("form")
          .send({
            // user from setup file that owns the "general" group
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
        await supertest(app)
          .patch(`/groups/${group.id}/members`)
          .set("Cookie", cookieControl.getCookie())
          .expect(200, { message: `User added to "${group.name}" group` });
      });

      it("adds user to group", async () => {
        const group = await GroupModel.findOne({ name: "general" });
        if (!group) {
          throw new Error("Error finding test group");
        }
        expect(group.members.length).toBe(2);
      });

      it("handles user already in group", async () => {
        const group = await GroupModel.findOne({ name: "general" });
        if (!group) {
          throw new Error("Error finding test group");
        }
        expect(group.members.length).toBe(2);
        await supertest(app)
          .patch(`/groups/${group.id}/members`)
          .set("Cookie", cookieControl.getCookie())
          .expect(400, {
            message: `User already member of "${group.name}" group`,
          });
      });
    });
  },

  () => {
    describe("GET /groups/member", () => {
      it("handles unauthenticated user", (done) => {
        supertest(app)
          .get("/groups/member")
          .expect(401, { message: "User authentication required" }, done);
      });

      it("handles user that belongs to a group", (done) => {
        supertest(app)
          .get("/groups/member")
          .set("Cookie", cookieControl.getCookie())
          .expect("Content-Length", "336")
          .expect(200, done);
      });

      it("handles user that doesn't belong to a group", async () => {
        const res = await supertest(app)
          .post("/users/login")
          .type("form")
          .send({
            username: "enemyofthestate",
            password: "Password123#",
          })
          .expect("Content-Type", /json/)
          .expect(200);
        // save cookie for future tests that require this user's session
        cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

        await supertest(app)
          .get("/groups/member")
          .set("Cookie", cookieControl.getCookie())
          .expect(200, { message: "Not a member of any groups" });
      });
    });
  },

  () => {
    describe("PATCH /groups/:groupId/mods", () => {
      it("handles unauthenticated user", (done) => {
        supertest(app)
          .patch("/groups/123abc/mods/321def")
          .expect(401, { message: "User authentication required" }, done);
      });

      it("handles invalid group id", (done) => {
        supertest(app)
          .patch("/groups/badgroupid/mods/baduserid")
          .set("Cookie", cookieControl.getCookie())
          .expect(400, { message: "Invalid group id" }, done);
      });

      it("handles nonexistant group with real user", async () => {
        const user = await UserModel.findOne({ username: "notreason" });
        if (!user) {
          throw new Error("Error finding test user");
        }
        await supertest(app)
          .patch(`/groups/601d0b50d91d180dd10d8f7a/mods/${user.id}`)
          .set("Cookie", cookieControl.getCookie())
          .expect(404, {
            message: "No group found with id 601d0b50d91d180dd10d8f7a",
          });
      });

      it("handles invalid user with nonexistant group", (done) => {
        supertest(app)
          .patch("/groups/601d0b50d91d180dd10d8f7a/mods/baduserid")
          .set("Cookie", cookieControl.getCookie())
          .expect(400, { message: "Invalid user id" }, done);
      });

      it("handles nonexistant user with real group", async () => {
        const group = await GroupModel.findOne({ name: "general" });
        if (!group) {
          throw new Error("Error finding test group");
        }
        await supertest(app)
          .patch(`/groups/${group.id}/mods/601d0b50d91d180dd10d8f7a`)
          .set("Cookie", cookieControl.getCookie())
          .expect(404, {
            message: "No user found with id 601d0b50d91d180dd10d8f7a",
          });
      });

      it("handles valid but nonexistant group & user", (done) => {
        supertest(app)
          .patch(
            "/groups/601d0b50d91d180dd10d8f7a/mods/601d0b50d91d180dd10d8f7a",
          )
          .set("Cookie", cookieControl.getCookie())
          .expect(
            404,
            {
              message:
                "No group found with id 601d0b50d91d180dd10d8f7a and no user found with id 601d0b50d91d180dd10d8f7a",
            },
            done,
          );
      });

      it("handles non-admin making the request", async () => {
        const group = await GroupModel.findOne({ name: "general" });
        if (!group) {
          throw new Error("Error finding test group");
        }
        const user = await UserModel.findOne({ username: "notreason" });
        if (!user) {
          throw new Error("Error finding test user");
        }
        await supertest(app)
          .patch(`/groups/${group.id}/mods/${user.id}`)
          .set("Cookie", cookieControl.getCookie())
          .expect(403, { message: "Only group admin can designate mods" });
      });

      it("successfully designates user as mod", async () => {
        const res = await supertest(app)
          .post("/users/login")
          .type("form")
          .send({
            // the admin of our "general" group
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
        const user = await UserModel.findOne({ username: "notreason" });
        if (!user) {
          throw new Error("Error finding test user");
        }
        await supertest(app)
          .patch(`/groups/${group.id}/mods/${user.id}`)
          .set("Cookie", cookieControl.getCookie())
          .expect(200, {
            message: `${user.username} added as mod to ${group.name} group`,
          });
      });

      it ("has the correct number of mods in array", async () => {
        const group = await GroupModel.findOne({ name: "general" });
        if (!group) {
          throw new Error("Error finding test group");
        }
        const user = await UserModel.findOne({ username: "notreason" });
        if (!user) {
          throw new Error("Error finding test user");
        }
        expect(group.mods.length).toBe(2);
        expect(group.mods.includes(user.id)).toBeTruthy();
      });
    });
  },
];

export default groupsTests;
