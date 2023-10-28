import mongoose from "mongoose";

export const fundersSchema = new mongoose.Schema({
  email: String,
  amount: Number,
});

const projectsSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    title: {
      type: String,
      required: [true, "please enter a valid title"],
      minlength: [4, "title can not be less than 4 chars"],
      maxlength: [25, "title can not exceed 25 characters"],
    },
    description: {
      type: String,
    },
    funds: {
      type: Number,
      min: [0, "The funds can not be less than 0"],
      required: [true, "price must be entered"],
    },
    collected: {
      type: Number,
      default: 0,
    },
    ownerid: {
      type: [String],
    },
    ownername: {
      type: String,
    },
    funders: [fundersSchema],
  },
  { timestamps: true }
);

const Projects = mongoose.model("projects", projectsSchema);

export default Projects;
