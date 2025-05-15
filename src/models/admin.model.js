import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema(
  {

    //data is coming from company registreation when superadmin accepts 
    //request than that particular data of dmin gets store here in that model full name is given
    //  fName: { 
    //   type: String,
    //   required: true,
    // },
    // lName: {
    //   type: String,
    //   required: true,
    // },
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    fullName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    gender:{
        type: String,
        default: null
    }, 
    dateOfJoining:{
        type: String,
        default: null
    },
    address:{
        type: String,
        default: null
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    position: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    otp: {
        type: String,
    },
    expiresAt: {
        type: Date,
    },
    photoUrl:{
        type: String,
        default: null
    },

    // 👇 Bank Details Array
    bankDetails: [{
        accountHolderName: { type: String, required: true },
        accountNumber: { type: String, required: true }, // encrypt in logic
        ifscCode: { type: String, required: true },
        bankName: { type: String }
    }],

    // 👇 Identity Documents Array
    identityDocs: [{
        aadhaarNumber: { type: String }, // encrypt
        panNumber: { type: String },     // encrypt
        aadhaarFrontUrl: { type: String },
        panCardUrl: { type: String }
    }]
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
