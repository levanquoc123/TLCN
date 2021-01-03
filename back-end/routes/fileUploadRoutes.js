// 'use strict'
require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
var AWS = require("aws-sdk");

// Multer ships with storage engines DiskStorage and MemoryStorage
// And Multer adds a body object and a file or files object to the request object. The body object contains the values of the text fields of the form, the file or files object contains the files uploaded via the form.
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

// app.get("/", (req, res) => {
//   AWS.config.update({
//     accessKeyId: "Your Key Goes Here",
//     secretAccessKey: "Your Secret Key Goes Here",
//   });
//   let s3 = new AWS.S3();
//   async function getImage() {
//     const data = s3
//       .getObject({
//         Bucket: "companyimages",
//         Key: "your stored image",
//       })
//       .promise();
//     return data;
//   }
//   getImage()
//     .then((img) => {
//       let image =
//         "<img src='data:image/jpeg;base64," + encode(img.Body) + "'" + "/>";
//       let startHTML = "<html><body></body>";
//       let endHTML = "</body></html>";
//       let html = startHTML + image + endHTML;
//       res.send(html);
//     })
//     .catch((e) => {
//       res.send(e);
//     });
//   function encode(data) {
//     let buf = Buffer.from(data);
//     let base64 = buf.toString("base64");
//     return base64;
//   }
// });

// Get all Documents s Routes
router.route("/").get((req, res, next) => {
  DOCUMENT.find(
    {},
    null,
    {
      sort: { createdAt: 1 },
    },
    (err, docs) => {
      if (err) {
        return next(err);
      }
      res.status(200).send(docs);
    }
  );
});

// Route to get a single existing GO data (needed for the Edit functionality)
// router.route("/:id").get((req, res, next) => {
//   DOCUMENT.findById(req.params.id, (err, go) => {
//     if (err) {
//       return next(err);
//     }
//     res.json(go);
//   });
// });

// route to upload a pdf document file
// In upload.single("file") - the name inside the single-quote is the name of the field that is going to be uploaded.
router.post("/upload", upload.single("file"), function (req, res) {
  const file = req.file;
  const s3FileURL = process.env.AWS_Uploaded_File_URL_LINK;

  let s3bucket = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: "8UB+kJySZCmhhoTkbjXSN9NSG9boPuJuSed8ucBd",
    region: process.env.AWS_REGION,
  });

  console.log(process.env.AWS_BUCKET_NAME);
  console.log(process.env.AWS_ACCESS_KEY_ID);
  console.log(process.env.AWS_SECRET_ACCESS_KEY);
  console.log(process.env.AWS_REGION);
  console.log(process.env.AWS_Uploaded_File_URL_LINK);

  //Where you want to store your file

  var params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  s3bucket.upload(params, function (err, data) {
    if (err) {
      res.status(500).json({ error: true, Message: err });
    } else {
      var urlParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: file.originalname,
      };

      s3bucket.upload(params, function (err, data) {
        if (err) {
          res.status(500).json({ error: true, Message: err });
        } else {
          res.send({ data });
          var newFileUploaded = {
            description: req.body.description,
            name: req.body.name,
            fileLink: s3FileURL + file.originalname,
            s3_key: params.Key,
          };
          var document = new DOCUMENT(newFileUploaded);
          document.save(function (error, newFile) {
            if (error) {
              throw error;
            }
          });
        }
      });
    }
  });
});
// Route to edit existing record's description field
// Here, I am updating only the description in this mongo record. Hence using the "$set" parameter
router.route("/edit/:id").put((req, res, next) => {
  DOCUMENT.findByIdAndUpdate(
    req.params.id,
    { $set: { description: Object.keys(req.body)[0] } },
    { new: true },
    (err, updateDoc) => {
      if (err) {
        return next(err);
      }
      res.status(200).send(updateDoc);
    }
  );
});

function encode(data) {
  let buf = Buffer.from(data);
  let base64 = buf.toString("base64");
  return base64;
}

// Router to delete a DOCUMENT file
router.route("/:id").get((req, res, next) => {
  let s3FileURL = process.env.AWS_Uploaded_File_URL_LINK;
  let s3bucket = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: "8UB+kJySZCmhhoTkbjXSN9NSG9boPuJuSed8ucBd",
    region: process.env.AWS_REGION,
  });
  const docId = req.params.id;
  DOCUMENT.findById(docId)
    .then((doc) => {
      let urlParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: doc.s3_key,
      };

      s3bucket.getSignedUrl("getObject", urlParams, function (err, url) {
        s3FileURL = url;
        console.log(s3FileURL);
        res.status(201).json({
          url,
          doc,
        });
      });
    })
    .catch((err) => {
      return res.status(401).json({ message: "error" + err.toString() });
    });
});
// Router to delete a DOCUMENT file
router.route("/:id").delete((req, res, next) => {
  DOCUMENT.findByIdAndRemove(req.params.id, (err, result) => {
    if (err) {
      return next(err);
    }
    //Now Delete the file from AWS-S3
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property
    let s3bucket = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    let params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: result.s3_key,
    };

    s3bucket.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        res.send({
          status: "200",
          responseType: "string",
          response: "success",
        });
      }
    });
  });
});

module.exports = router;
