const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
var serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => {
        return validator.isEmail(v);
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },

  description: {
    type: String,
  },
  SecretaryOfService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  ServiceAssistantSecretary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  servants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  emailVerify: String,
  emailVerifyExpires: Date,
  emailConfirm: {
    type: Boolean,
    default: false,
  },
});
serviceSchema.pre("save", async function (next) {
  if (this.isModified("email")) {
    this.emailConfirm = false;
  }

  next();
});

serviceSchema.methods.verifyEmail = async function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerify = crypto.createHash("sha256").update(token).digest("hex");
  this.emailVerifyExpires = Date.now() + 30 * 60 * 1000; // 10 minutes
  return token;
};

//Export the model
module.exports = mongoose.model("Service", serviceSchema);
