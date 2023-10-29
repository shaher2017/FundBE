import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Projects from "../projects/projects.js";
import Theuser from "./theuser.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, password, email, gender } = req.body;
    if (!name.trim() || !password.trim() || !email.trim() || !gender.trim()) {
      return res.status(400).json({ msg: "All fields are required" });
    }
    const hashedpassword = await bcrypt.hash(password, 12);
    const newUser = new Theuser({
      name: name,
      password: hashedpassword,
      email: email,
      gender: gender,
      projectsid: [],
    });
    await newUser.save();

    res.status(201).json({ msg: "User added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while adding the user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    console.log("reached");
    const { email, password } = req.body;
    const user = await Theuser.findOne({ email: email });
    if (!user) {
      return res.status(403).json({ msg: "Wrong Email" });
    }
    bcrypt
      .compare(password, user.password)
      .then((isMatch) => {
        if (isMatch) {
          const token = jwt.sign(
            { email: user.email },
            process.env.SECRET_KEY,
            {
              expiresIn: "30d",
            }
          );
          res
            .status(201)
            .cookie("fund-token", token, {
              secure: true,
              httpOnly: true,
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .json({ name: user.name, token: token });
        } else {
          return res.status(403).json({ msg: "Wrong password" });
        }
      })
      .catch((err) => {
        console.error("Error comparing passwords:", err);
        return res.status(500).json({ msg: "Internal Server Error" });
      });
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.get("/checkemail", async (req, res) => {
  const email = req.query.email;
  if (await Theuser.findOne({ email: email })) {
    res.status(201).json({ msg: "email already in use." });
  } else {
    res.status(200).json({ msg: "email is available." });
  }
});

const vretify_jwt = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(403).json({ msg: "Sign in first" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(403).json({ msg: "Invalid token" });
  }
};

// router.get("/logout", vretify_jwt, async (req, res) => {
//   res.status(201).clearCookie("fund-token").json({ msg: "token deleted" });
// });

router.get("/userprojects", vretify_jwt, async (req, res) => {
  const email = req.email;
  try {
    const user = await Theuser.findOne({ email: email });
    if (user) {
      const projects = user.projectsid;
      const projectsdata = await Projects.find({ _id: { $in: projects } });
      res.status(200).json({ projects, projectsdata });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

//////////////////////////////////////// Get User Data //////////////////////////////////////////
router.get("/userdata", vretify_jwt, async (req, res) => {
  try {
    const email = req.email;
    const user = await Theuser.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { _id, name, projectsid } = user;

    res.status(200).json({ id: _id, name, projectsid });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router, vretify_jwt };
