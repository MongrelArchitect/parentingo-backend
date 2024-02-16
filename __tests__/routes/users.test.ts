import supertest from "supertest";
import app from "../../app";
import UserModel from "@models/user";
import UserInterface from "@interfaces/Users";

describe("POST /users", () => {
  supertest(app).post("/users").expect(400);

  it("handles no form data", (done) => {
    supertest(app).post("/users").expect(400, done);
  });

  it("handles missing & invalid form data", (done) => {
    supertest(app)
      .post("/users")
      .type("form")
      .send({
        password: "Password123#",
        email: "email",
        name: "murray rothbard",
      })
      .expect(
        400,
        {
          message: "Invalid form data - see 'errors' for detail",
          errors: {
            email: {
              type: "field",
              value: "email",
              msg: "Invalid email",
              path: "email",
              location: "body",
            },
            username: {
              type: "field",
              value: "",
              msg: "Username required",
              path: "username",
              location: "body",
            },
          },
        },
        done,
      );
  });

  it("handles existing username & password", (done) => {
    const testUser: UserInterface = {
      password: "Password123#",
      email: "murray@rothbard.com",
      name: "murray rothbard",
      username: "enemyofthestate",
      followers: [],
      following: [],
      lastLogin: new Date(),
    };
    const newUser = new UserModel(testUser);
    newUser.save();

    supertest(app)
      .post("/users")
      .type("form")
      .send({
        password: "Password123#",
        email: "murray@rothbard.com",
        name: "murray rothbard",
        username: "enemyofthestate",
      })
      .expect(
        400,
        {
          message: "Invalid form data - see 'errors' for detail",
          errors: {
            email: {
              type: "field",
              value: "murray@rothbard.com",
              msg: "Email already in use",
              path: "email",
              location: "body",
            },
            username: {
              type: "field",
              value: "enemyofthestate",
              msg: "Username already taken",
              path: "username",
              location: "body",
            },
          },
        },
        done,
      );
  });

  it("creates new user", (done) => {
    supertest(app)
      .post("/users")
      .type("form")
      .send({
        password: "Password123#",
        email: "ludwig@vonmises.com",
        name: "ludwig von mises",
        username: "praxman",
      })
      .expect(201, done);
  });
});
