
const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");

const Product = require("../models/productModel");
const { errorHandler } = require("../helpers/dbErrorHandler");
const { exec } = require("child_process");

require("dotenv").config();

const multer = require("multer");
var AWS = require("aws-sdk");

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;

  return { limit, offset };
};

// Retrieve all Products from the database.
exports.findAll = (req, res) => {
  const { page, size, name } = req.query;
  var condition = name
    ? { name: { $regex: new RegExp(name), $options: "i" } }
    : {};

  const { limit, offset } = getPagination(page, size);

  const options = {
    populate: "category",
    offset: offset,
    limit: limit,
  };

  Product.paginate(condition, options)
    .then((data) => {
      res.status(201).json({
        totalItems: data.totalDocs,
        products: data.docs,
        totalPages: data.totalPages,
        currentPage: data.page - 1,
      });
    })
    .catch((err) => {
      res.status(500).json({
        message:
          err.message || "Some error occurred while retrieving products.",
      });
    });
};

// Find all published Products
exports.findAllPublished = (req, res) => {
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);

  Product.find()
    .populate("category")
    .paginate({ published: true }, { offset, limit })
    .populate("category")
    .exec(err, (data) => {})
    .then((data) => {
      res.status(201).send({
        totalItems: data.totalDocs,
        products: data.docs,
        category: data.categories,
        totalPages: data.totalPages,
        currentPage: data.page - 1,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving products.",
      });
    });
};

exports.getProducts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = req.query.limit || 3;
  let totalItems;
  try {
    const totalItems = await Product.find().countDocuments();
    const products = await Product.find()
      .populate("category")
      // .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Fetched products successfully.",
      products: products,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
      // return res.status(400).json({ error: errorHandler(err) });
    }
    next(err);
  }

};

//Middlewares
exports.getProductById = (req, res, next, id) => {
  Product.findById(id)
    .populate("category")
    .exec((err, product) => {
      if (err || !product)
        return res.status(400).json({ error: "The product does not exist" });
      req.product = product;
      next();
    });
};

exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    console.log(req.product.photo);
    res.set("Content-Type", req.product.photo.contentType);
    return res.status(201).send(req.product.photo.data);
  }
  next();
};

exports.read = (req, res) => {
  req.product.photo = undefined;
  return res.status(201).json(req.product);
};

exports.deleteProduct = (req, res) => {
  let product = req.product;
  product.remove((err, deletedProduct) => {
    if (err || !product)
      return res.status(400).json({ error: "The product does not exist" });
    res.status(200).json({
      message: "Product deleted successfully",
    });
  });
};

exports.updateProduct = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  //Parses an incoming node.js request containing form data
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    let product = req.product;
    //using Lodash to deep clone the object
    product = _.extend(product, fields);

    // 1kb = 1000
    // 1mb = 1000000

    if (files.photo) {
      console.log("FILES PHOTO: ", files.photo);
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: "Image should be less than 1 MB in size",
        });
      }
      //read the photo file and save into database
      product.photo.data = fs.readFileSync(files.photo.path);
      product.photo.contentType = files.photo.type;
    }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.status(201).json(result);
    });
  });
};

// route to upload a pdf document file
// In upload.single("file") - the name inside the single-quote is the name of the field that is going to be uploaded.
exports.createProductS3 = (req, res) => {
  if (!req.file) {
    return res.status(422).json({ message: "Failed" });
  }
  const file = req.file;
  const imageUrl = process.env.AWS_Uploaded_File_URL_LINK;

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
            name: req.body.name,
            published: req.body.published,
            imageUrl: s3FileURL + file.originalname,
            s3_key: params.Key,
            description: req.body.description,
            quantity: req.body.quantity,
            price: req.body.price,
            category: req.body.categoryId,
            shipping: req.body.shipping,
          };
          var product = new Product(newFileUploaded);
          product.save((err, result) => {
            if (err) {
              return res.status(400).json({
                error: errorHandler(err),
              });
            }
            res.status(201).json(result);
          });
        }
      });
    }
  });
};

exports.createProduct = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  //Parses an incoming node.js request containing form data
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    // check for all fields
    const { name, description, price, category, quantity, shipping } = fields;

    if (
      !name ||
      !description ||
      !price ||
      !category ||
      !quantity
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    let product = new Product(fields);

    // 1kb = 1000
    // 1mb = 1000000

    if (files.photo) {
      // console.log('FILES PHOTO: ', files.photo);
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: "Image should be less than 1 MB in size",
        });
      }
      //read the photo file and save into database
      product.photo.data = fs.readFileSync(files.photo.path);
      product.photo.contentType = files.photo.type;
    }

    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.status(201).json(result);
    });
  });
};

/*
sell / arrival
sort by sold /products?sortBy=sold&order=desc&limit=4
sort by arrival /products?sortBy=createAt&order=desc&limit=4
if no params are sent, then all products are returned
*/

exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : "asc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 6;

  Product.find()
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, product) => {
      if (err)
        return res.status(400).json({ error: "The product does not exist" });
      res.status(201).json(product);
    });
};

// list all other products that in the same categories
// it will find the products based on the req product category
// other products that has the same category, will be returned
exports.listRelated = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 6;

  Product.find({ _id: { $ne: req.product }, category: req.product.category })
    .limit(limit)
    .populate("category", "_id name")
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.status(201).json(products);
    });
};

//list all categories that the product belongs to
exports.listCategories = (req, res) => {
  Product.distinct("category", {}, (err, categories) => {
    if (err) return res.status(400).json({ error: "The categories not found" });
    res.status(201).json(categories);
  });
};

/*
list products by search
we will implement product search in react frontend
we will show categories in checkbox and price range in radio buttons
an api request as the user clicks on those checkbox and radio buttons
we will make api request and show the products to users based on what he wants
*/
exports.listBySearch = (req, res) => {
  let order = req.body.order ? req.body.order : "desc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  // console.log(order, sortBy, limit, skip, req.body.filters);
  // console.log("findArgs", findArgs);

  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        // gte -  greater than price [0-10]
        // lte - less than
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1],
        };
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  //{ category: [ '5e28f40052bf23398431bd17', ... ], price: { '$gte': 0, '$lte': 9 } }
  console.log("findArgs", findArgs);

  Product.find(findArgs)
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.status(201).json({
        size: data.length,
        data,
      });
    });
};

exports.listSearch = (req, res) => {
  const query = {};
  // create query object to hold search value and category value
  // assign search value to query.name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
    // assign category value to query.category
    if (req.query.category && req.query.category != "All") {
      query.category = req.query.category;
    }
    // find the product based on query object with 2 properties
    // search and category
    // find the product based on query {name:value, category:id}
    Product.find(query, (err, products) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.status(201).json(products);
    }).select("-photo");
  }
};

//https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/
//https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite/
exports.decreaseQuantity = (req, res, next) => {
  let bulkOps = req.body.order.products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    };
  });

  Product.bulkWrite(bulkOps, {}, (error, product) => {
    if (error) {
      return res.status(400).json({
        error: "Could not update the product",
      });
    }
    next();
  });
};

exports.getProductSoldMost = async (req, res) => {
  try {
    await Product.find({published: false, quantity: { $gte: 1 }})
      .sort("-createdAt")
      .select("-photo")
      .exec(function (err, products) {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json(products);
        }
      });
  } catch (err) {
    res.json({ result: "error", message: err.msg });
  }
};
