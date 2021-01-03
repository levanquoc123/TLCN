const Mongoose = require("mongoose");
const { Schema } = Mongoose;

const CartItemSchema = new Mongoose.Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    name: String,
    price: Number,
    count: Number,
  },
  { timestamps: true }
);

const CartItem = Mongoose.model("CartItem", CartItemSchema);

const OrderSchema = new Mongoose.Schema(
  {
    products: [CartItemSchema],
    transaction_id: {},
    amount: { type: Number },
    address: String,
    status: {
      type: String,
      default: "Not processed",
      enum: [
        "Not processed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ], // enum means string objects
    },
    updated: Date,
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Order = Mongoose.model("Order", OrderSchema);

module.exports = { Order, CartItem };
