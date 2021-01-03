const Mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { Schema } = Mongoose;

const ProductSchema = new Mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 32,
    },
    published: {
      type: Boolean,
      default: false,
    },
    s3_key: { type: String },
    photo: {
      data: Buffer,
      contentType: String,
    },
    description: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000,
    },
    quantity: {
      type: Number,
    },
    price: {
      type: Number,
      trim: true,
      required: true,
      maxlength: 32,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sold: {
      type: Number,
      default: 0,
    },
    shipping: {
      required: false,
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

ProductSchema.plugin(mongoosePaginate);

module.exports = Mongoose.model("Product", ProductSchema);
