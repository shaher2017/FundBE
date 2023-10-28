import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { vretify_jwt } from "../theusers/theusersRouter.js";
import Projects from "./projects.js";
import Theusers from "../theusers/theuser.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "./images/",
  filename: (req, file, callback) => {
    callback(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
});

//////////////////////////////////// GET ALL PROJECTS /////////////////////////////////////////////////////
router.get("/allprojects", async (req, res) => {
  let page = Number(req.query.page);
  page = page - 1;

  try {
    const projects = await Projects.find()
      .skip(page * 9)
      .limit(9);
    const projectsno = await Projects.find().count();
    const pagesno = Math.ceil(projectsno / 9);
    res.json({ projects, pagesno });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});
//////////////////////////////// get user funded projects //////////////////////////////////////////
router.get("/getuserfunds", vretify_jwt, async (req, res) => {
  let page = Number(req.query.page);
  const email = req.email;
  page = page - 1;

  try {
    const fundedProjects = await Projects.find({});
    let projects = [];
    for (let p of fundedProjects) {
      for (let pf of p.funders) {
        if (pf["email"] === email) {
          let amount = pf["amount"];
          let projectWithAmount = { ...p.toObject(), amount: amount };
          projects.push(projectWithAmount);
        }
      }
    }

    const projectsno = projects.length;
    const start = page * 9;
    const end = start + 9;
    const pagedProjects = projects.slice(start, end);

    const pagesno = Math.ceil(projectsno / 9);

    res.json({ projects: pagedProjects, pagesno });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});

//////////////////////////////////// ADD PROJECTS /////////////////////////////////////////////////////
router.post(
  "/addproject",
  vretify_jwt,
  upload.single("image"),
  async (req, res) => {
    const { title, funds, description } = req.body;
    const imagePath = req.file ? req.file.path : "";
    const userEmail = req.email;
    const user = await Theusers.findOne({ email: userEmail });
    if (!title || !funds) {
      return res.status(400).json({ msg: "all data are required" });
    }
    try {
      const project = new Projects({
        title: title,
        funds: Number(funds),
        image: imagePath,
        description: description,
        ownerid: user._id,
        ownername: user.name,
      });
      await project.save();

      user.projectsid.push(project.id);
      await user.save();
      res.status(201).json({ msg: "Project added successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: error.message });
    }
  }
);

//////////////////////////////////// DELETE PROJECTS /////////////////////////////////////////////////////
router.delete("/deleteproject", vretify_jwt, async (req, res) => {
  const id = req.query.id;
  const email = req.email;
  const user = await Theusers.findOne({ email: email });
  if (user.projectsid.includes(id)) {
    try {
      const project = await Projects.findOneAndDelete({ _id: id });

      if (!project) {
        return res.status(404).json({ msg: "Project not found" });
      }

      // remove from files
      if (project.image) {
        fs.unlink(project.image, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
      await user.projectsid.remove(id);
      await user.save();
      return res.status(200).json({ msg: "Project deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ msg: "An error occurred while deleting the project" });
    }
  } else
    return res
      .status(403)
      .json({ msg: "You are not authorized to delete this project" });
});

//////////////////////////////////// UPDATE PROJECTS /////////////////////////////////////////////////////
router.patch("/updateproject", vretify_jwt, async (req, res) => {
  const { id, projectdata } = req.body;
  const email = req.email;
  const user = await Theusers.findOne({ email: email });
  if (user.projectsid.includes(id)) {
    try {
      await Projects.findOneAndUpdate(
        { _id: id },
        {
          title: projectdata.title,
          funds: Number(projectdata.funds),
          description: projectdata.description,
        }
      );
      res.status(200).json({ msg: "Project updated successfully" });
    } catch (error) {
      res
        .status(401)
        .json({ msg: "An error occurred while updating the project" });
    }
  }
});

//////////////////////////////////// GET USER PROJECTS /////////////////////////////////////////////////////
router.get("/getuserprojects", vretify_jwt, async (req, res) => {
  const email = req.email;
  try {
    const user = await Theusers.findOne({ email: email });
    const userIds = user.projectsid;
    const projects = await Projects.find({ _id: { $in: userIds } });

    return res.status(200).json({ projects });
  } catch (error) {
    return res.status(401).json({ msg: "Wrong data" });
  }
});

//////////////////////////////////// GET PROJECT Details /////////////////////////////////////////////////////
router.get("/projectdata", vretify_jwt, async (req, res) => {
  try {
    const projectid = req.query.projectid;
    const email = req.email;
    const user = await Theusers.findOne({ email: email });

    const project = await Projects.findOne({ _id: projectid });
    res.status(200).json({ project });
  } catch (error) {
    return res.status(401).json({ msg: error });
  }
});

//////////////////////////////////// GET FAV PROJECTS /////////////////////////////////////////////////////
router.post("/favprojects", vretify_jwt, async (req, res) => {
  const selector = req.body;
  const projects = await Projects.find({ _id: { $in: selector } });
  return res.status(200).json({ projects });
});

//////////////////////////////////// FUNDING PROJECTS /////////////////////////////////////////////////////
router.patch("/paying", vretify_jwt, async (req, res) => {
  const { id, pay } = req.body;

  try {
    if (typeof pay !== "number" || pay < 0) {
      return res.status(400).json({ msg: "Invalid payment amount" });
    }

    const project = await Projects.findOne({ _id: id });

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const paid = project.collected;

    if (project.funds === project.collected) {
      res.status(200).json({
        msg: "No more funded needed",
      });
      return;
    } else if (paid + pay > project.funds) {
      await Projects.findOneAndUpdate(
        { _id: id },
        { collected: project.funds }
      );
      res.status(200).json({
        msg: "Fund paid successfully but there was more than required.",
      });
      return;
    }
    await Projects.findOneAndUpdate({ _id: id }, { collected: pay + paid });

    res.status(200).json({ msg: "Fund paid successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "An error occurred while paying the fund" });
  }
});

export { router };
