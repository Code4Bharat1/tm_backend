import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema(
  {
    fName: {
      type: String,
      required: true,
    },
    lName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
  }
);

adminSchema.pre(
  "save",
  async function (next) {
    if (!this.isModified("password"))
      return next();
    const salt = await bcrypt.genSalt(
      10
    );
    this.password = await bcrypt.hash(
      this.password,
      salt
    );
    next();
  }
);

adminSchema.methods.matchPassword =
  async function (enteredPassword) {
    return await bcrypt.compare(
      enteredPassword,
      this.password
    );
  };
export default mongoose.model(
  "Admin",
  adminSchema
);
