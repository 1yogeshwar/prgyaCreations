const Product = require("../models/product.model");

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { category, subcategory, minPrice, maxPrice,
            inStock, onSale, featured, bestseller, isNew, sort, search } = req.query;

    const query = {};
    if (category)           query.category    = category;
    if (subcategory)        query.subcategory = subcategory;
    if (inStock === "true") query.stock       = { $gt: 0 };
    if (onSale === "true")  query.isOnSale    = true;
    if (featured === "true")   query.isFeatured   = true;
    if (bestseller === "true") query.isBestseller = true;
    if (isNew === "true")      query.isNew        = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) query.name = { $regex: search, $options: "i" };

    const sortMap = {
      newest:       { createdAt: -1 },
      "price-asc":  { price: 1 },
      "price-desc": { price: -1 },
      rating:       { rating: -1 },
      featured:     { isFeatured: -1 },
    };
    const sortOption = sortMap[sort] || { createdAt: -1 };

    const products = await Product.find(query).sort(sortOption);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/products/:slug
const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/products  (admin only)
const createProduct = async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/products/:id  (admin only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/products/:id  (admin only)
const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProducts, getProductBySlug, createProduct, updateProduct, deleteProduct };
