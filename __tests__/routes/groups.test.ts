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
    }),
];

export default groupsTests;
