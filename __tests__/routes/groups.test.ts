import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";
import GroupModel from "@models/group";

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
          .expect("Content-Length", "326")
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
        it ("handles unauthenticated user", async () => {
          const group = await GroupModel.findOne({name:"general"});
          if (!group) {
            throw new Error("Error finding test group");
          }
          await supertest(app)
            .patch(`/groups/${group.id}/members`)
            .expect(401);
        });
      });
    },
];

export default groupsTests;
