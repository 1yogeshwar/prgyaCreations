const mongoose = require("mongoose");

// Optional so existing catalog records remain valid. New products should carry
// these values before they are eligible for automatic shipment creation.
const shippingSchema = new mongoose.Schema({
  sku: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [100, "Shipping SKU cannot exceed 100 characters"],
    validate: {
      validator: (value) => !value || /^[A-Z0-9][A-Z0-9._/-]*$/i.test(value),
      message: "Shipping SKU may contain only letters, numbers, periods, underscores, slashes, and hyphens",
    },
  },
  weightKg: {
    type: Number,
    min: [0.001, "Shipping weight must be greater than 0 kg"],
  },
  lengthCm: {
    type: Number,
    min: [0.1, "Shipping length must be greater than 0 cm"],
  },
  breadthCm: {
    type: Number,
    min: [0.1, "Shipping breadth must be greater than 0 cm"],
  },
  heightCm: {
    type: Number,
    min: [0.1, "Shipping height must be greater than 0 cm"],
  },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  slug:          { type: String, required: true, unique: true, lowercase: true },
  description:   { type: String, required: true },
  price:         { type: Number, required: true },
  originalPrice: { type: Number },
  discount:      { type: Number, default: 0 },
  images:        [{ type: String }],
  category:      { type: String, required: true },
  subcategory:   { type: String },
  colors:        [{ name: String, hex: String }],
  sizes:         [{ type: String }],
  stock:         { type: Number, default: 0 },
  rating:        { type: Number, default: 0 },
  reviewCount:   { type: Number, default: 0 },
  isFeatured:    { type: Boolean, default: false },
  isBestseller:  { type: Boolean, default: false },
  isNew:         { type: Boolean, default: false },
  isOnSale:      { type: Boolean, default: false },
  tags:          [{ type: String }],
  shipping:      { type: shippingSchema, default: undefined },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

productSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
