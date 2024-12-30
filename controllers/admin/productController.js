const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { error } = require("console");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    res.render("product-add", {
      cat: category,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const productExists = await Product.findOne({
      productName: { $regex: new RegExp(`^${products.productName}$`, "i") },
    });

    if (!productExists) {
      const images = [];

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;

          const resizedImagePath = path.join(
            "public",
            "uploads",
            "product-images",
            req.files[i].filename
          );
          await sharp(originalImagePath)
            .resize({ width: 440, height: 440 })
            .toFile(resizedImagePath);
          images.push(req.files[i].filename);
        }
      }

      const categoryId = await Category.findById(products.category);

      if (!categoryId) {
        return res.status(400).json({ error: "Invalid Category Name" });
      }

      let sizes = [];
      let totalQuantity = 0;
      if (products.quantityS) {
        totalQuantity += parseInt(products.quantityS);
        sizes.push({ size: 'S', quantity: parseInt(products.quantityS) });
      }
      if (products.quantityM) {
        totalQuantity += parseInt(products.quantityM);
        sizes.push({ size: 'M', quantity: parseInt(products.quantityM) });
      }
      if (products.quantityL) {
        totalQuantity += parseInt(products.quantityL);
        sizes.push({ size: 'L', quantity: parseInt(products.quantityL) });
      }

      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        sizes: sizes,
        quantity: totalQuantity,
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      return res.redirect("/admin/addProducts");
    } else {
      return res.status(400).json({
        error: "Product already exists, please try with another name",
      });
    }
  } catch (error) {
    console.error("Error adding product", error);
    res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 10;

    const productData = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    })
      .sort({ createdAt: -1 }) // Ensure products are sorted by creation date in descending order
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    }).countDocuments();
    console.log("productdat", productData);

    const category = await Category.find({ isListed: true });
    console.log(productData);

    if (category) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
      });
    } else {
      res.render("pageerror");
    }
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.error("Error getting all products");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });

    if (findCategory.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "This products category already has a category offer",
      });
    }

    if (isNaN(percentage)) {
      return res.json({
        status: false,
        message: "The offer percentage should be a positive number below 100",
      });
    }

    if (percentage > 100 || percentage < 1) {
      return res.json({
        status: false,
        message: "The offer percentage should be a positive number below 100",
      });
    }

    findProduct.salePrice =
      findProduct.salePrice -
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = parseInt(percentage);
    await findProduct.save();
    findCategory.categoryOffer = 0;
    await findCategory.save();

    res.json({ status: true });
  } catch (error) {
    res.redirect("/admin/pageerror");
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const percentage = findProduct.productOffer;
    findProduct.salePrice =
      findProduct.salePrice +
      Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = 0;
    await findProduct.save();

    res.json({ status: true });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });
    const category = await Category.find({});

    res.render("edit-product", {
      product: product,
      cat: category,
    });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error:
          "Product with this name already exists, please try with another name",
      });
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }
    let sizes = [];
    if (data.sizes && Array.isArray(data.sizes)) {
      sizes = data.sizes.map((size) => ({
        size: size, // Get the size value
        quantity: data[`quantity${size}`] || 0, // Get the corresponding quantity from the form
      }));
    }

    // Prepare the fields to update
    const updateFields = {
      productName: data.productName,
      description: data.description, // Ensure this matches the form field name
      category: data.category,

      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      sizes: sizes,
    };

    if (images.length > 0) {
      const product = await Product.findById(id);
      updateFields.productImage = [...product.productImage, ...images];
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (updatedProduct) {
      console.log("Product updated successfully");
      return res.redirect("/admin/products");
    } else {
      return res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    console.error("Error updating product", error);
    res.redirect("/admin/pageerror");
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.join(
      "public",
      "uploads",
      "product-images",
      imageNameToServer
    );
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found`);
    }
    res.send({ status: true });
  } catch (error) {
    res.redirect("pageerror");
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  blockProduct,
  unblockProduct,
  editProduct,
  getEditProduct,
  deleteSingleImage,
  addProductOffer,
  removeProductOffer,
};
