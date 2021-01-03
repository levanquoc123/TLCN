const { validationResult } = require("express-validator");
const { errorHandler } = require("../helpers/dbErrorHandler");
const Category = require("../models/categoryModel");
const _ = require("lodash");

exports.getCategories = (req, res, next) => {

  Category.find().exec((err, data) => {
    if (err) return res.status(400).json({ error: errorHandler(err) });
    res.status(200).json(data);
  });
};

exports.getCategoryById = (req, res, next, id) => {
  Category.findById(id).exec((err, category) => {
    if (err || !category)
      return res.status(400).json({ error: "The category does not exist" });
    req.category = category;
    next();
  });
};

exports.read = (req, res) => {
  return res.status(200).json(req.category);
};

exports.createCategory = async (req, res, next) => {

  const name = req.body.name;
  const category = new Category({
    name: name,
  });

  try {
    await category.save();
    res.status(201).json({
      message: "Category created successfully!",
      category: category,
    });
  } catch (err) {
    if (err) {
      return res.status(400).json({ error: errorHandler(err) });
    }
  }
};

exports.updateCategory = (req, res) => {
  const updatedFields = req.body;
  const updatedCategory = _.extend(req.category, updatedFields);
  updatedCategory.save((err, data) => {
    if (err) return res.status(400).json({ error: errorHandler(err) });
    res.status(200).json({ data });
  });
};

exports.deleteCategory = (req, res) => {
  let category = req.category;
  category.remove((err, deletedCategory) => {
    if (err || !category)
      return res.status(400).json({ error: "The category does not exist" });
    res.status(201).json({
      message: "Category deleted successfully",
    });
  });
};
