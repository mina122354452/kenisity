const expressAsyncHandler = require("express-async-handler");
const Service = require("../models/serviceModel");
const sendEmail = require("./emailCtrl");
const { generateVerifyMailForService } = require("../messages/email");
const crypto = require("crypto");
const createService = expressAsyncHandler(async (req, res) => {
  const {
    name,
    email,
    description,
    SecretaryOfService,
    ServiceAssistantSecretary,
    servants,
  } = req.body;
  const findService = await Service.findOne({ name });
  if (!findService) {
    const newService = await Service.create({
      name,
      email,
      description,
      SecretaryOfService,
      ServiceAssistantSecretary,
      servants,
    });
    if (newService.emailConfirm === false) {
      verifyEmailToken(req, res);
    } else {
      return res.status(201).json({
        status: "success",
        message: "Service created",
      });
    }
  } else {
    if (findService.emailConfirm === false) {
      verifyEmailToken(req, res);
    } else {
      return res.status(201).json({
        message: "Service is already exist",
      });
    }
    //FIXME:cutsom error handler
  }
});
//!NOTE: using id if admin or SecretaryGeneralOfServices needs id service to edit
//!NOTE: if isSecretaryOfService can edit the service which he serves in
const editService = expressAsyncHandler(async (req, res) => {
  const { id } = req.body;

  const {
    name,
    email,
    description,
    SecretaryOfService,
    ServiceAssistantSecretary,
    servants,
  } = req.body;
  if (!id && !req.user.servesIn) {
    throw new Error(
      "you don't serve in certain service and you did't provide id"
    );
  }
  const service = await Service.findById(
    req.user.role == "admin" || req.user.SecretaryGeneralOfServices == true
      ? id
      : req.user.servesIn
  );

  if (!service) {
    if (
      req.user.role != "admin" &&
      req.user.SecretaryGeneralOfServices != true &&
      !req.user.servesIn
    ) {
      throw new Error("you don't serve in certain service");
    } else {
      throw new Error("Service not found");
    }
  } else {
    if (name) service.name = name;
    if (email) service.email = email;
    if (description) service.description = description;
    if (SecretaryOfService) service.SecretaryOfService = SecretaryOfService;
    if (ServiceAssistantSecretary)
      service.ServiceAssistantSecretary = ServiceAssistantSecretary;
    if (servants) service.servants = servants;

    await service.save();
    return res.status(200).json({
      message: "Service updated",
    });
    //FIXME:cutsom error handler
  }
});
//!NOTE: using name
const verifyEmailToken = expressAsyncHandler(async (req, res) => {
  const { name } = req.body;
  console.log(req.body);

  const service = await Service.findOne({ name });

  if (!service) throw new Error("service Not Found With this name");
  try {
    if (service.emailConfirm === false) {
      const email = service.email;
      const token = await service.verifyEmail();
      await service.save();
      // todo
      let mail = await generateVerifyMailForService(token, service.name);
      console.log(token);
      const data = {
        to: email,
        subject: "verify service Email",
        html: mail,
      };
      await sendEmail(data);
      res.status(201).json({
        status: "successfully",
        message: "we sent email verification",
      });
    } else {
      res.status(200).json({
        status: "Not Modified",
        message: "your email is already verified",
      });
    }
  } catch (error) {
    throw new Error(error);
  }
});
const verifyEmail = expressAsyncHandler(async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const service = await Service.findOne({
    emailVerify: hashedToken,
    emailVerifyExpires: {
      $gt: Date.now(),
    },
  });
  //FIXME:cutsom error handler
  if (!service) throw new Error("token Expired,please try again later");
  service.emailConfirm = true;
  service.emailVerify = undefined;
  service.emailVerifyExpires = undefined;
  await service.save();
  if (service.emailConfirm === true) {
    res.status(202).json({
      status: "successfully",
      message: "service created and the email address verified successfully",
    });
  }
});

const getAllServices = expressAsyncHandler(async (req, res) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering for comparison operators
    let queryStr = JSON.stringify(queryObj);

    // Parse the modified query string back into an object
    const parsedQueryObj = JSON.parse(queryStr);

    // Add regex search for title or any other text fields
    if (parsedQueryObj.name) {
      parsedQueryObj.name = {
        $regex: parsedQueryObj.name,
        $options: "i",
      };
    }

    let query = Service.find(parsedQueryObj);

    // Find the product with the minimum price

    // If there are no matching products, return appropriate response

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Limiting the fields
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select(
        "-emailVerifyExpires -emailVerify -emailConfirm   -__v"
      );
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    query = query.skip((page - 1) * limit).limit(limit);

    // Count total number of documents for pagination
    const totalProducts = await Service.countDocuments(parsedQueryObj);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

    if (req.query.page && page > totalPages) {
      return res.status(404).json({
        message: "This page does not exist",
      });
    }

    const services = await query;

    // Include only the prices of the min and max products in the response
    res.json({
      services,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({ message: error.message });
  }
});

module.exports = {
  createService,
  editService,
  verifyEmail,
  verifyEmailToken,
  getAllServices,
};
