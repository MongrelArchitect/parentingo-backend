import supertest from "supertest";
import app from "../../app";

describe("GET /groups/:groupId", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123")
      .expect(401, { message: "User authentication required" }, done);
  });
});

describe("POST /groups", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123")
      .expect(401, { message: "User authentication required" }, done);
  });
});
