import bcrypt from "bcrypt";
import supertest from "supertest";
import app from "../../app";

import UserModel from "@models/user";
import UserInterface from "@interfaces/Users";

import cookieControl from "../config/session";

// this will be our valid test user
const validUser = {
  password: "SomePass123#",
  email: "test@test.com",
  name: "Testy McGee",
  username: "testyman",
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
          message: "Invalid input - check each field for errors",
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

  it("handles existing username & password", async () => {
    const hashedPass = await bcrypt.hash("Password123#", 10);
    const testUser: UserInterface = {
      password: hashedPass,
      email: "murray@rothbard.com",
      id: "",
      name: "murray rothbard",
      username: "enemyofthestate",
      followers: [],
      following: [],
      lastLogin: new Date(),
    };
    const newUser = new UserModel(testUser);
    newUser.id = newUser._id.toString();
    newUser.save();

    await supertest(app)
      .post("/users")
      .type("form")
      .send({
        password: "Password123#",
        email: "murray@rothbard.com",
        name: "murray rothbard",
        username: "enemyofthestate",
      })
      .expect("Content-Type", /json/)
      .expect(400, {
        message: "Invalid input - check each field for errors",
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
      });
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
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);
  });

  it("handles attempt with authenticated user", (done) => {
    supertest(app)
      .post("/users/")
      .set("Cookie", cookieControl.getCookie())
      .send({
        password: validUser.password,
        email: "new@email.com",
        name: validUser.name,
        username: "newname",
      })
      .expect("Content-Type", /json/)
      // length should be the same even if the id is different each test
      .expect(
        400,
        {
          message:
            "Authenticated session already exists - log out to create new user",
        },
        done,
      );
  });
});

describe("GET /users/current", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/users/current")
      .expect("Content-Type", /json/)
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles authenticated user", (done) => {
    supertest(app)
      .get("/users/current")
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Type", /json/)
      // length should be the same even if the id is different each test
      .expect("Content-Length", "183")
      .expect(200, done);
  });
});

describe("POST /users/logout", () => {
  it("handles attempt without authenticated user", (done) => {
    supertest(app).post("/users/logout").expect("Content-Type", /json/).expect(
      401,
      {
        message: "User authentication required",
      },
      done,
    );
  });

  it("handles attempt with authenticated user", (done) => {
    supertest(app)
      .post("/users/logout")
      .set("Cookie", cookieControl.getCookie())
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

  it("handles correct username & password", async () => {
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: validUser.username,
        password: validUser.password,
      })
      .expect("Content-Type", /json/)
      // id will be different, but should be the same length every time
      .expect("Content-Length", "62")
      .expect(200);
    // save cookie for other tests that require an authenticated session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);
  });

  it("handles attempt with authenticated user", (done) => {
    supertest(app)
      .post("/users/login")
      .set("Cookie", cookieControl.getCookie())
      .type("form")
      .send({
        username: validUser.username,
        password: validUser.password,
      })
      .expect("Content-Type", /json/)
      .expect(403, { message: "User already authenticated" }, done);
  });
});

describe("GET /users/:userId", () => {
  it("handles unauthenticated user", async () => {
    const user = await UserModel.findOne({ username: "praxman" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .get(`/users/${user.id}/`)
      .expect(401, { message: "User authentication required" });
  });

  it("handles invalid user id", (done) => {
    supertest(app)
      .get("/users/badid123/")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid user id" }, done);
  });

  it("handles valid but nonexistant user id", (done) => {
    supertest(app)
      .get("/users/601d0b50d91d180dd10d8f7a/")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        { message: "No user found with id 601d0b50d91d180dd10d8f7a" },
        done,
      );
  });

  it("responds with user info", async () => {
    const user = await UserModel.findOne({ username: "praxman" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .get(`/users/${user.id}/`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: "User found",
        user: { username: "praxman", name: "Ludwig von Mises" },
      });
  });
});
