import mongoose from "mongoose";

const theusersSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 255,
      minlength: 5,
    },
    email: {
      type: String,
      unique: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    projectsid: {
      type: [String],
    },
  },
  { timestamps: true }
);

const Theusers = mongoose.model("theusers", theusersSchema);

export default Theusers;
