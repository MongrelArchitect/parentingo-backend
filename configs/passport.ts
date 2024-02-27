import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import UserModel from "@models/user";
import UserInterface from "@interfaces/Users";

export default function setupPassport() {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await UserModel.findOne({ username });
        if (!user) {
          return done(null, false, {
            message: "Incorrect username or password",
          });
        }
        const passMatch = await bcrypt.compare(password, user.password);
        if (!passMatch) {
          return done(null, false, {
            message: "Incorrect username or password",
          });
        }
        // update the user's login date
        user.lastLogin = new Date();
        await user.save();
        // we have our user, just need their id as a string
        return done(null, user._id.toString());
      } catch (err) {
        done(err);
      }
    }),
  );

  passport.serializeUser((id, done) => {
    process.nextTick(() => {
      return done(null, id);
    });
  });

  passport.deserializeUser((id: string, done) => {
    process.nextTick(async () => {
      try {
        const user = await UserModel.findById(id);
        if (!user) {
          return done(null, false);
        } else {
          const userInfo: UserInterface = {
            avatar: user.avatar,
            email: user.email,
            followers: user.followers,
            following: user.following,
            id: user.id,
            // using the interface in our controllers, but with a junk pass
            password: "",
            lastLogin: user.lastLogin,
            name: user.name,
            username: user.username,
          };
          return done(null, userInfo);
        }
      } catch (err) {
        done(err);
      }
    });
  });
}
