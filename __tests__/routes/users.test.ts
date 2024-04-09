import bcrypt from "bcrypt";
import path from "path";
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

// usersController.createNewUser
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
      created: new Date(),
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

// usersController.getCurrentUser
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
      .expect("Content-Length", "220")
      .expect(200, done);
  });
});

// usersController.logoutUser
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

// usersController.loginUser
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

// usersController.getUserInfo
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
      .expect("Content-Length", "147")
      .expect(200);
  });
});

// usersController.patchUpdateProfile
describe("PATCH /users/current", () => {
  it("handles unauthenticated user", async () => {
    await supertest(app)
      .patch("/users/current")
      .expect(401, { message: "User authentication required" });
  });

  it("handles invalid form data", async () => {
    await supertest(app)
      .patch("/users/current")
      .set("Cookie", cookieControl.getCookie())
      .send({
        name: "",
      })
      .expect("Content-Type", /json/)
      .expect(400);
  });

  it("handles files that are too large", async () => {
    const bigImagePath = path.join(__dirname, "../files/big.png");
    await supertest(app)
      .patch("/users/current")
      .set("Cookie", cookieControl.getCookie())
      .attach("avatar", bigImagePath)
      .expect("Content-Type", /json/)
      .expect(413, { message: "File too large (10MB max)" });
  });

  it("updates user info", async () => {
    const imagePath = path.join(__dirname, "../files/small.jpg");
    await supertest(app)
      .patch("/users/current")
      .set("Cookie", cookieControl.getCookie())
      .attach("avatar", imagePath)
      .field({
        name: "New Name",
        bio: "This is my bio info",
      })
      .expect("Content-Type", /json/)
      .expect(200, { message: "User info updated" });

    const user = await UserModel.findOne({username: validUser.username});
    if (!user) {
      throw new Error("Error finding test user");
    }
    expect(user.name).toBe("New Name");
    expect(user.bio).toBe("This is my bio info");
    expect(user.avatar).toBeTruthy();
  });
});

// usersController.patchFollowUser
describe("PATCH /users/:userId/follow", () => {
  it("handles unauthenticated user", async () => {
    const user = await UserModel.findOne({ username: "praxman" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/users/${user.id}/follow`)
      .expect(401, { message: "User authentication required" });
  });

  it("handles invalid user id", (done) => {
    supertest(app)
      .patch("/users/badid123/follow")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid user id" }, done);
  });

  it("handles valid but nonexistant user id", (done) => {
    supertest(app)
      .patch("/users/601d0b50d91d180dd10d8f7a/follow")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        { message: "No user found with id 601d0b50d91d180dd10d8f7a" },
        done,
      );
  });

  it("prevents user from following themselves", async () => {
    const user = await UserModel.findOne({username: validUser.username});
    if (!user) {
      throw new Error("Error getting test user");
    }
    await supertest(app)
      .patch(`/users/${user.id}/follow`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "User cannot follow themselves" });
  });

  it("follows user", async () => {
    const userToFollow = await UserModel.findOne({username: "praxman"});
    if (!userToFollow) {
      throw new Error("Error getting test user");
    }
    await supertest(app)
      .patch(`/users/${userToFollow.id}/follow`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, { message: "User is now following praxman" });
  });

  it("has correct followers / following arrays", async () => {
    const userToFollow = await UserModel.findOne({username: "praxman"});
    if (!userToFollow) {
      throw new Error("Error getting test user");
    }
    const authUser = await UserModel.findOne({username:validUser.username});
    if (!authUser) {
      throw new Error("Error getting test auth user");
    }
    expect(authUser.following.length).toBe(1);
    expect(userToFollow.followers.length).toBe(1);
    expect(authUser.following.includes(userToFollow.id)).toBeTruthy();
    expect(userToFollow.followers.includes(authUser.id)).toBeTruthy();
  });

  it("prevents following a user multiple times", async () => {
    const userToFollow = await UserModel.findOne({username: "praxman"});
    if (!userToFollow) {
      throw new Error("Error getting test user");
    }
    await supertest(app)
      .patch(`/users/${userToFollow.id}/follow`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "User already following praxman" });
  });
});


// usersController.patchUnfollowUser
describe("PATCH /users/:userId/unfollow", () => {
  it("handles unauthenticated user", async () => {
    const user = await UserModel.findOne({ username: "praxman" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/users/${user.id}/unfollow`)
      .expect(401, { message: "User authentication required" });
  });

  it("handles invalid user id", (done) => {
    supertest(app)
      .patch("/users/badid123/unfollow")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid user id" }, done);
  });

  it("handles valid but nonexistant user id", (done) => {
    supertest(app)
      .patch("/users/601d0b50d91d180dd10d8f7a/unfollow")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        { message: "No user found with id 601d0b50d91d180dd10d8f7a" },
        done,
      );
  });

  it("handles user that isn't currently being followed", async () => {
    const user = await UserModel.findOne({username: "imbanned"});
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/users/${user.id}/unfollow`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "User is not following imbanned" });
  });

  it("unfollows user", async () => {
    const userToUnfollow = await UserModel.findOne({username: "praxman"});
    if (!userToUnfollow) {
      throw new Error("Error getting test user");
    }
    await supertest(app)
      .patch(`/users/${userToUnfollow.id}/unfollow`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, { message: "User is no longer following praxman" });
  });

  it("has correct followers / following arrays", async () => {
    const userToUnfollow = await UserModel.findOne({username: "praxman"});
    if (!userToUnfollow) {
      throw new Error("Error getting test user");
    }
    const authUser = await UserModel.findOne({username:validUser.username});
    if (!authUser) {
      throw new Error("Error getting test auth user");
    }
    expect(authUser.following.length).toBe(0);
    expect(userToUnfollow.followers.length).toBe(0);
    expect(authUser.following.includes(userToUnfollow.id)).toBeFalsy();
    expect(userToUnfollow.followers.includes(authUser.id)).toBeFalsy();
  });
});
