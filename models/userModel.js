const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const validator = require("validator");

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
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

    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },
    SecretaryGeneralOfServices: {
      type: Boolean,
      default: false,
      required: true,
    },
    SecretaryOfService: {
      type: Boolean,
      default: false,
      required: true,
    },
    ServiceAssistantSecretary: {
      type: Boolean,
      default: false,
      required: true,
    },
    servant: {
      type: Boolean,
      default: false,
      required: true,
    },
    servesIn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      // default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
    },
    emailVerify: String,
    emailVerifyExpires: Date,
    emailConfirm: {
      type: Boolean,
      default: false,
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSaltSync(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified("email")) {
    this.emailConfirm = false;
  }

  next();
});

userSchema.methods.isPasswordMatched = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.createPasswordResetToken = async function () {
  const resettoken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resettoken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 10 minutes
  return resettoken;
};
userSchema.methods.verifyEmail = async function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerify = crypto.createHash("sha256").update(token).digest("hex");
  this.emailVerifyExpires = Date.now() + 30 * 60 * 1000; // 10 minutes
  return token;
};

//Export the model
module.exports = mongoose.model("User", userSchema);
