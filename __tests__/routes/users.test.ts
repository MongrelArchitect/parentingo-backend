import supertest from "supertest";
import app from "../../app";

describe('POST /users', () => {
  it('handles missing form data', (done) => {
    supertest(app)
      .post("/users")
      .expect(400, done);
  });
});
