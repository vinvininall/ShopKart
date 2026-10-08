const mongoose = require("mongoose");
const Product = require("../models/product.model");

const seedProducts = [
  {
    name: "Mechanical Keyboard",
    description: "RGB mechanical keyboard with blue switches for precise typing.",
    price: 2999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80",
    stock: 10,
  },
  {
    name: "Classic Leather Jacket",
    description: "Premium leather jacket built for everyday style and comfort.",
    price: 4999,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    stock: 6,
  },
  {
    name: "The Lean Startup",
    description: "A practical guide to building and growing a business with innovation.",
    price: 699,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80",
    stock: 20,
  },
  {
    name: "Premium Aroma Diffuser",
    description: "A soothing home fragrance diffuser with ambient lighting.",
    price: 1899,
    category: "Home",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    stock: 14,
  },
];

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedDescription = typeof description === "string" ? description.trim() : "";
    const normalizedCategory = typeof category === "string" ? category.trim() : "";
    const normalizedImage = typeof image === "string" ? image.trim() : "";
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!normalizedName || !normalizedDescription || !normalizedCategory || !normalizedImage || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "All product fields are required",
      });
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative",
      });
    }

    const product = await Product.create({
      name: normalizedName,
      description: normalizedDescription,
      price: parsedPrice,
      category: normalizedCategory,
      image: normalizedImage,
      stock: parsedStock,
    });

    return res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the product",
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const filter = {};

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    let sortOption = { createdAt: -1 };

    if (sort === "price_asc") {
      sortOption = { price: 1 };
    }

    if (sort === "price_desc") {
      sortOption = { price: -1 };
    }

    const totalProducts = await Product.countDocuments(filter);

    if (totalProducts === 0) {
      const fallbackProducts = await Product.countDocuments();
      if (fallbackProducts === 0) {
        const products = await Product.insertMany(seedProducts);
        return res.status(200).json({
          success: true,
          count: products.length,
          products,
        });
      }
    }

    const products = await Product.find(filter).sort(sortOption).lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading products",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading the product",
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
};
