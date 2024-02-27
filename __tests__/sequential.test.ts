import groupsTests from "./routes/groups.test";
import usersTests from "./routes/users.test";

describe("Run all test suites in series", () => {
  usersTests.forEach((test) => test())
  groupsTests.forEach((test) => test())
});
