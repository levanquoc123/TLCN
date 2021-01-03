
const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken"); // to generate signed token
const expressJwt = require("express-jwt"); // for authorization check
// const User = require("../models/userModel");
const { errorHandler } = require("../helpers/dbErrorHandler");

const expressValidator = require("express-validator");

const fetch = require("node-fetch");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const config = require("../config/auth");

const db = require("../models");
const User = db.User.User;
const Role = db.role;

const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
var smtpTransport = require("nodemailer-smtp-transport");

const transporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  })
);

exports.signUp = (req, res) => {
  console.log("req.body", req.body);
  const user = new User(req.body);

  if (req.body.roles) {
    Role.find(
      {
        name: { $in: req.body.roles },
      },
      (err, roles) => {
        if (err) {
          res.status(500).json({ message: err });
          return;
        }

        user.roles = roles.map((role) => role._id);

        user.save((err, user) => {
          if (err) {
            return res.status(400).json({
              error: errorHandler(err),
            });
          }

          user.salt = undefined;
          user.hashed_password = undefined;

          res.status(200).json({
            user,
          });
        });
      }
    );
  } else {
    Role.findOne({ name: "user" }, (err, role) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      user.roles = [role._id];
      user.save((err, user) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }

        user.salt = undefined;
        user.hashed_password = undefined;

        res.status(200).json({
          user,
        });
      });
    });
  }
};

exports.getHomeAll = (req, res) => {
  res.json({ message: "Welcome to minhkhoa application." });
};

exports.signIn = (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .populate("roles", "-__v")
    .exec((err, user) => {
      // if (err) {
      //   res.status(500).send({ message: err });
      //   return;
      // }

      // if (!user) {
      //   return res.status(404).send({ message: "User Not found." });
      // }

      // var passwordIsValid = bcrypt.compareSync(
      //   req.body.hashed_password,
      //   user.hashed_password
      // );

      // if (!passwordIsValid) {
      //   return res.status(401).send({
      //     accessToken: null,
      //     message: "Invalid Password!",
      //   });
      // }

      // var token = jwt.sign({ id: user.id }, config.secret, {
      //   expiresIn: 86400, // 24 hours
      // });

      if (err || !user) {
        return res.status(400).json({
          error: "Email hoặc mật khẩu không chính xác. Xin mời đăng ký!",
        });
      }
      // if user is found make sure the email and password match
      // create authenticate method in user model
      if (!user.authenticate(password)) {
        return res.status(401).json({
          error: "Email hoặc mật khẩu không chính xác",
        });
      }

      // generate a signed token with user id and secret
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      // persist the token as 't' in cookie with expiry date
      res.cookie("t", token, { expire: new Date() + 9999 });

      var authorities = [];
      

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
      }
      
      return res.status(200).send({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          roles: authorities,
        },

        // accessToken: token,
      });
    });

  // find the user based on email
  // const { email, password } = req.body;
  // User.findOne({ email }, (err, user) => {
  //   if (err || !user) {
  //     return res.status(400).json({
  //       error: "User with that email does not exist. Please register!",
  //     });
  //   }
  //   // if user is found make sure the email and password match
  //   // create authenticate method in user model
  //   if (!user.authenticate(password)) {
  //     return res.status(401).json({
  //       error: "Email or password do not match",
  //     });
  //   }
  //   // generate a signed token with user id and secret
  //   const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
  //     expiresIn: "7d",
  //   });
  //   // persist the token as 't' in cookie with expiry date
  //   res.cookie("t", token, { expire: new Date() + 9999 });

  //   var authorities = [];

  //   for (let i = 0; i < user.roles.length; i++) {
  //     authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
  //   }
  //   // return response with user and token to frontend client
  //   // const { _id, name, email, role } = user;
  //   return res.status(200).send({
  //     token,
  //     user: {
  //       _id: user._id,
  //       name: user.name,
  //       email: user.email,
  //       roles: authorities,
  //     },

  //     // accessToken: token,
  //   });
  //   // return res.status(200).json({ token, user: { _id, email, name, role } });
  // });
};

exports.signOut = (req, res) => {
  res.clearCookie("t");
  res.status(200).json({ message: "Sign out successfully" });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"], // added later
  userProperty: "auth",
});

exports.isAuth = (req, res, next) => {
  let user = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!user) {
    return res.status(403).json({
      error: "Access denied",
    });
  }

  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.profile.role === 0) {
    return res.status(403).json({
      error: "Admin resource! Access denied",
    });
  }

  next();
};

//Similar to sign up
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "Người dùng với email không tồn tại",
      });
    }

    const token = jwt.sign(
      { _id: user._id, name: user.name },
      process.env.JWT_RESET_PASSWORD,
      {
        expiresIn: "30m",
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Password Reset link`,
      html: `
                <h1>Please use the following link to reset your password</h1>
                <p>${process.env.CLIENT_URL}auth/password/reset/${token}</p>
                <hr />
                <p>This email may contain sensitive information</p>
                
            `,
    };

    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        console.log("RESET PASSWORD LINK ERROR", err);
        return res.status(400).json({
          error: "Database connection error on user password forgot request",
        });
      } else {
        transporter
          .sendMail(emailData)
          .then((sent) => {
            console.log("SIGNUP EMAIL SENT", sent);
            return res.status(200).json({
              message: `Email has been sent to ${email}. Follow the instruction to reset your password.`,
            });
          })
          .catch((err) => {
            console.log("SIGNUP EMAIL SENT ERROR", err);
            return res.status(401).json({
              message: err.message,
            });
          });
      }
    });
  });
};

//Similar to accountActivation
exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;
  // 1.Check if token is available and verify with the backend
  if (resetPasswordLink) {
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      (err, decoded) => {
        if (err) {
          console.log("jwt RESET PASSWORD error", err);
          res
            .status(401)
            .json({ error: "liên kết đã hết hạn. Vui lòng đặt lại mật khẩu " });
        }
        // 2. Find the user in the database from the token
        User.findOne({ resetPasswordLink }, (err, user) => {
          if (err) {
            return res.status(401).json({
              error: "Could not find the token in the database",
            });
          }
          const updatedFields = {
            password: newPassword,
            resetPasswordLink: "",
          };
          //use Lodash to deep clone the object instead of Object.assign
          user = Object.assign(user, updatedFields);
          user.save((err, results) => {
            if (err) {
              return res.status(401).json({
                error: "Fail to updated the user password",
              });
            }
            res
              .status(200)
              .json({ message: "Your password has been updated!" });
          });
        });
      }
    );
  } else {
    return res.status(400).json({ message: "Reset token is not found" });
  }
};

/**
 * POST /login
 * Sign in with email and password
 */
exports.loginPost = function (req, res, next) {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("email", "Email cannot be blank").notEmpty();
  req.assert("password", "Password cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ remove_dots: false });

  // Check for validation error
  var errors = req.validationErrors();
  if (errors) return res.status(400).send(errors);

  User.findOne({ email: req.body.email }, function (err, user) {
    if (!user)
      return res.status(401).send({
        msg:
          "The email address " +
          req.body.email +
          " is not associated with any account. Double-check your email address and try again.",
      });

    user.comparePassword(req.body.password, function (err, isMatch) {
      if (!isMatch)
        return res.status(401).send({ msg: "Invalid email or password" });

      // Make sure the user has been verified
      if (!user.isVerified)
        return res.status(401).send({
          type: "not-verified",
          msg: "Your account has not been verified.",
        });

      // Login successful, write token, and send back user
      res.send({ token: generateToken(user), user: user.toJSON() });
    });
  });
};

const crypto = require("crypto");
// var nodemailer = require("nodemailer");

/**
 * POST /signup
 */
exports.signupPost = function (req, res, next) {
  req.assert("name", "Name cannot be blank").notEmpty();
  req.assert("email", "Email is not valid").isEmail();
  req.assert("email", "Email cannot be blank").notEmpty();
  req.assert("password", "Password must be at least 4 characters long").len(4);
  req.sanitize("email").normalizeEmail({ remove_dots: false });

  // Check for validation errors
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send(errors);
  }

  // Make sure this account doesn't already exist
  User.findOne({ email: req.body.email }, function (err, user) {
    // Make sure user doesn't already exist
    if (user)
      return res.status(400).send({
        msg:
          "The email address you have entered is already associated with another account.",
      });

    // Create and save the user
    user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });
    user.save(function (err) {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }

      // Create a verification token for this user
      var token = new Token({
        _userId: user._id,
        token: crypto.randomBytes(16).toString("hex"),
      });

      // Save the verification token
      token.save(function (err) {
        if (err) {
          return res.status(500).send({ msg: err.message });
        }

        // Send the email
        // var transporter = nodemailer.createTransport({
        //   service: "Sendgrid",
        //   auth: {
        //     user: process.env.SENDGRID_USERNAME,
        //     pass: process.env.SENDGRID_PASSWORD,
        //   },
        // });
        var mailOptions = {
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: "Account Verification Token",
          text:
            "Hello,\n\n" +
            "Please verify your account by clicking the link: \nhttp://" +
            req.headers.host +
            "/confirmation/" +
            token.token +
            ".\n",
        };
        transporter.sendMail(mailOptions, function (err) {
          if (err) {
            return res.status(500).send({ msg: err.message });
          }
          res
            .status(200)
            .send("A verification email has been sent to " + user.email + ".");
        });
      });
    });
  });
};

/**
 * POST /confirmation
 */
exports.confirmationPost = function (req, res, next) {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("email", "Email cannot be blank").notEmpty();
  req.assert("token", "Token cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ remove_dots: false });

  // Check for validation errors
  var errors = req.validationErrors();
  if (errors) return res.status(400).send(errors);

  // Find a matching token
  Token.findOne({ token: req.body.token }, function (err, token) {
    if (!token)
      return res.status(400).send({
        type: "not-verified",
        msg:
          "We were unable to find a valid token. Your token my have expired.",
      });

    // If we found a token, find a matching user
    User.findOne(
      { _id: token._userId, email: req.body.email },
      function (err, user) {
        if (!user)
          return res
            .status(400)
            .send({ msg: "We were unable to find a user for this token." });
        if (user.isVerified)
          return res.status(400).send({
            type: "already-verified",
            msg: "This user has already been verified.",
          });

        // Verify and save the user
        user.isVerified = true;
        user.save(function (err) {
          if (err) {
            return res.status(500).send({ msg: err.message });
          }
          res.status(200).send("The account has been verified. Please log in.");
        });
      }
    );
  });
};

/**
 * POST /resend
 */
exports.resendTokenPost = function (req, res, next) {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("email", "Email cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ remove_dots: false });

  // Check for validation errors
  var errors = req.validationErrors();
  if (errors) return res.status(400).send(errors);

  User.findOne({ email: req.body.email }, function (err, user) {
    if (!user)
      return res
        .status(400)
        .send({ msg: "We were unable to find a user with that email." });
    if (user.isVerified)
      return res.status(400).send({
        msg: "This account has already been verified. Please log in.",
      });

    // Create a verification token, save it, and send email
    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex"),
    });

    // Save the token
    token.save(function (err) {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }

      // Send the email
      // var transporter = nodemailer.createTransport({
      //   service: "Sendgrid",
      //   auth: {
      //     user: process.env.SENDGRID_USERNAME,
      //     pass: process.env.SENDGRID_PASSWORD,
      //   },
      // });
      var mailOptions = {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Account Verification Token",
        text:
          "Hello,\n\n" +
          "Please verify your account by clicking the link: \nhttp://" +
          req.headers.host +
          "/confirmation/" +
          token.token +
          ".\n",
      };
      transporter.sendMail(mailOptions, function (err) {
        if (err) {
          return res.status(500).send({ msg: err.message });
        }
        res
          .status(200)
          .send("A verification email has been sent to " + user.email + ".");
      });
    });
  });
};
