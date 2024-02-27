import supertest from "supertest";
import app from "../../app";
import cookieControl from "../config/session";

const groupsTests = [
  () =>
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
          .get("/groups/123")
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
            name: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          })
          .expect("Content-Type", /json/)
          .expect(
            400,
            {
              message: "Invalid input - check each field for errors",
              errors: {
                name: {
                  type: "field",
                  value:
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  msg: "Name cannot be more than 255 characters",
                  path: "name",
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
          })
          .expect("Content-Type", /json/)
          .expect("Content-Length", "180")
          .expect(201, done);
      });

      it("handles existing group name", (done) => {
        supertest(app)
          .post("/groups")
          .set("Cookie", cookieControl.getCookie())
          .type("form")
          .send({
            name: "test group",
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
];

export default groupsTests;
