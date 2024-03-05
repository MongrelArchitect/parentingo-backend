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

describe("GET /groups/owned", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/owned")
      .expect("Content-Type", /json/)
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles user with no owned groups", async () => {
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    await supertest(app)
      .get("/groups/owned")
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Type", /json/)
      .expect(200, { message: "No owned groups found" });
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
      .expect("Content-Length", "337")
      .expect(200);
  });
});

describe("GET /groups/:groupId", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/123")
      .expect("Content-Type", /json/)
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .get("/groups/badid123/")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles valid but nonexistant group id", (done) => {
    supertest(app)
      .get("/groups/601d0b50d91d180dd10d8f7a/")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        { message: "No group found with id 601d0b50d91d180dd10d8f7a" },
        done,
      );
  });

  it("responds with group info", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }

    await supertest(app)
      .get(`/groups/${group.id}/`)
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Length", "301")
      .expect(200);
  });
});

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
      .expect("Content-Length", "236")
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
});

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
        { message: "No group found with id 601d0b50d91d180dd10d8f7a" },
        done,
      );
  });

  it("handles authenticated user", async () => {
    // first we need a user that isn't already in the group
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
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

  it("doesn't add user if they're banned", async () => {
    // first we need our banned user to login
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "imbanned",
        password: "ImBanned123#",
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
      .expect(403, {
        message: `User banned from joining ${group.name} group`,
      });
  });
});

describe("GET /groups/member", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .get("/groups/member")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles user that belongs to a group", async () => {
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    supertest(app)
      .get("/groups/member")
      .set("Cookie", cookieControl.getCookie())
      .expect("Content-Length", "374")
      .expect(200);
  });

  it("handles user that doesn't belong to a group", async () => {
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "imbanned",
        password: "ImBanned123#",
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

describe("PATCH /groups/:groupId/mods/:userId", () => {
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

  it("handles nonexistant group", async () => {
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

  it("has the correct number of mods in array", async () => {
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

  it("denies request if user is not a group member", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const user = await UserModel.findOne({ username: "imbanned" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/mods/${user.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, {
        message: "Only group members can be mods",
      });
  });
});

describe("PATCH /groups/:groupId/mods/demote/:userId", () => {
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .patch("/groups/123abc/mods/demote/321def")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .patch("/groups/badgroupid/mods/demote/baduserid")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles nonexistant group", async () => {
    const user = await UserModel.findOne({ username: "notreason" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/groups/601d0b50d91d180dd10d8f7a/mods/demote/${user.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No group found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("handles nonexistant user with real group", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/mods/demote/601d0b50d91d180dd10d8f7a`)
      .set("Cookie", cookieControl.getCookie())
      .expect(404, {
        message: "No user found with id 601d0b50d91d180dd10d8f7a",
      });
  });

  it("handles non-admin making the request", async () => {
    // need a non-admin user
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
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
    const user = await UserModel.findOne({ username: "notreason" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/mods/demote/${user.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(403, { message: "Only group admin can demote mods" });
  });

  it("successfully demotes mod to member", async () => {
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
      .patch(`/groups/${group.id}/mods/demote/${user.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200, {
        message: `${user.username} demoted from mod to member`,
      });
  });

  it("has the correct number of mods in array", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const user = await UserModel.findOne({ username: "notreason" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    expect(group.mods.length).toBe(1);
    expect(group.mods.includes(user.id)).toBeFalsy();
  });

  it("denies request if user is not a group mod", async () => {
    const group = await GroupModel.findOne({ name: "general" });
    if (!group) {
      throw new Error("Error finding test group");
    }
    const user = await UserModel.findOne({ username: "notreason" });
    if (!user) {
      throw new Error("Error finding test user");
    }
    await supertest(app)
      .patch(`/groups/${group.id}/mods/demote/${user.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(400, {
        message: "Only mods can be demoted",
      });
  });
});

describe("PATCH /groups/:groupId/leave", () => {
  // XXX
  it("handles unauthenticated user", (done) => {
    supertest(app)
      .patch("/groups/somebadid/leave")
      .expect(401, { message: "User authentication required" }, done);
  });

  it("handles invalid group id", (done) => {
    supertest(app)
      .patch("/groups/badid123/leave")
      .set("Cookie", cookieControl.getCookie())
      .expect(400, { message: "Invalid group id" }, done);
  });

  it("handles valid but nonexistant group id", (done) => {
    supertest(app)
      .patch("/groups/601d0b50d91d180dd10d8f7a/leave")
      .set("Cookie", cookieControl.getCookie())
      .expect(
        404,
        { message: "No group found with id 601d0b50d91d180dd10d8f7a" },
        done,
      );
  });

  it("removes user from group membership", async () => {
    const group = await GroupModel.findOne({name:"general"});
    if (!group) {
      throw new Error("Error finding test group");
    }
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    await supertest(app)
      .patch(`/groups/${group.id}/leave`)
      .set("Cookie", cookieControl.getCookie())
      .expect(
        200,
        { message: `User has left ${group.name} group` }
      );
  });

  it("group contains correct members", async () => {
    const group = await GroupModel.findOne({name:"general"});
    if (!group) {
      throw new Error("Error finding test group");
    }
    const user = await UserModel.findOne({username:"notreason"});
    if (!user) {
      throw new Error("Error finding test user");
    }
    expect(group.members.length).toBe(1);
    expect(group.members.includes(user.id)).toBeFalsy();
  });

  it("handles attempt with non member", async () => {
    const group = await GroupModel.findOne({name:"general"});
    if (!group) {
      throw new Error("Error finding test group");
    }
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "imbanned",
        password: "ImBanned123#",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    await supertest(app)
      .patch(`/groups/${group.id}/leave`)
      .set("Cookie", cookieControl.getCookie())
      .expect(
        403,
        { message: `User is not a member of ${group.name} group` }
      );
  });

  it("prevents admin from leaving group", async () => {
    const group = await GroupModel.findOne({name:"general"});
    if (!group) {
      throw new Error("Error finding test group");
    }
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    await supertest(app)
      .patch(`/groups/${group.id}/leave`)
      .set("Cookie", cookieControl.getCookie())
      .expect(
        403,
        { message: "Admin cannot leave group" }
      );
  });

  it("handles mod leaving", async () => {
    const group = await GroupModel.findOne({name:"general"});
    if (!group) {
      throw new Error("Error finding test group");
    }
    const userToAdd = await UserModel.findOne({username:"notreason"});
    if (!userToAdd) {
      throw new Error("Error finding test user");
    }

    // first sign in as a user not part of the group
    const res = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(res.headers["set-cookie"][0].split(";")[0]);

    // have the user join the group
    await supertest(app)
      .patch(`/groups/${group.id}/members`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200);

    // now sign in as group admin
    const resTwo = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "praxman",
        password: "HumanAction123$",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(resTwo.headers["set-cookie"][0].split(";")[0]);

    // add the new user as a mod
    await supertest(app)
      .patch(`/groups/${group.id}/mods/${userToAdd.id}`)
      .set("Cookie", cookieControl.getCookie())
      .expect(200);

    // sign back in as the new mod
    const resThree = await supertest(app)
      .post("/users/login")
      .type("form")
      .send({
        username: "notreason",
        password: "NoAuthority68!",
      })
      .expect("Content-Type", /json/)
      .expect(200);
    // save cookie for future tests that require this user's session
    cookieControl.setCookie(resThree.headers["set-cookie"][0].split(";")[0]);

    // now try to leave the group
    await supertest(app)
      .patch(`/groups/${group.id}/leave`)
      .set("Cookie", cookieControl.getCookie())
      .expect(
        200,
        { message: `Mod has left ${group.name} group` }
      );
  });

  it("group contains correct mods", async () => {
    const group = await GroupModel.findOne({name:"general"});
    if (!group) {
      throw new Error("Error finding test group");
    }
    const user = await UserModel.findOne({username:"notreason"});
    if (!user) {
      throw new Error("Error finding test user");
    }
    expect(group.mods.length).toBe(1);
    expect(group.mods.includes(user.id)).toBeFalsy();
  });
});
