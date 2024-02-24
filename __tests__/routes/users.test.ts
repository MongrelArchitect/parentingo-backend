import supertest from "supertest";
import app from "../../app";
import UserModel from "@models/user";
import UserInterface from "@interfaces/Users";

// will be used to store session cookie data when user created / logged in
let cookie = "";

// this will be our valid test user
const validUser = {
  password: "Password123#",
  email: "ludwig@vonmises.com",
  name: "ludwig von mises",
  username: "praxman",
};

describe("POST /users", () => {
  it("handles no form data", (done) => {
    supertest(app)
      .post("/users")
      .expect("Content-Type", /json/)
      .expect(400, done);
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
      .expect("Content-Type", /json/)
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
      .expect("Content-Type", /json/)
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

  it("creates new user", async () => {
    const res = await supertest(app)
      .post("/users")
      .type("form")
      // we're gonna use this user in all subsequent tests that require auth
      .send({
        password: validUser.password,
        email: validUser.email,
        name: validUser.name,
        username: validUser.username,
      })
      .expect("Content-Type", /json/)
      .expect(201);
    // save cookie for other tests that require an authenticated session
    cookie = res.headers["set-cookie"][0].split(";")[0];
  });
});

describe("GET /users/current", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/users/current")
      .expect("Content-Type", /json/)
      .expect(401, { message: "Authentication required" }, done);
  });

  it("handles authenticated user", (done) => {
    supertest(app)
      .get("/users/current")
      .set("Cookie", cookie)
      .expect("Content-Type", /json/)
      // length should be the same even if the id is different each test
      .expect("Content-Length", "179")
      .expect(200, done);
  });
});

describe("POST /users/login", () => {
  it("handles missing form data", (done) => {
    supertest(app)
      .post("/users/login")
      .expect("Content-Type", /json/)
      .expect(
        400,
        {
          message: "Invalid form data - see 'errors' for detail",
          errors: {
            username: {
              type: "field",
              value: "",
              msg: "Username required",
              path: "username",
              location: "body",
            },
            password: {
              type: "field",
              msg: "Password required",
              path: "password",
              location: "body",
            },
          },
        },
        done,
      );
  });

  it("handles nonexistant username", (done) => {
    supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "nobody",
        password: "password",
      })
      .expect("Content-Type", /json/)
      .expect(
        401,
        {
          name: "AuthenticationError",
          error: "AuthenticationError: Unauthorized",
          message: "Unauthorized",
        },
        done,
      );
  });

  it("handles incorrect password", (done) => {
    supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: validUser.username,
        password: "badpass",
      })
      .expect(
        401,
        {
          name: "AuthenticationError",
          error: "AuthenticationError: Unauthorized",
          message: "Unauthorized",
        },
        done,
      );
  });

  it("handles correct username & password", (done) => {
    supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: validUser.username,
        password: validUser.password,
      })
      // id will be different, but should be the same length every time
      .expect("Content-Type", /json/)
      .expect("Content-Length", "62")
      .expect(200, done);
  });
});

describe("POST /users/logout", () => {
  it("handles attempt without authenticated user", (done) => {
    supertest(app).post("/users/logout").expect("Content-Type", /json/).expect(
      401,
      {
        message: "Authentication required",
      },
      done,
    );
  });

  it("handles attempt with authenticated user", (done) => {
    supertest(app)
      .post("/users/logout")
      .set("Cookie", cookie)
      .expect("Content-Type", /json/)
      .expect(
        200,
        {
          message: "User logged out",
        },
        done,
      );
  });
});
