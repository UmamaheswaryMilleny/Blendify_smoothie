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
        if (products.sizes && Array.isArray(products.sizes)) {
          sizes = products.sizes.map((size, index) => ({
            size: size,
            quantity: products[`quantity${size}`] || 0,
          }));
        }
  
        const newProduct = new Product({
          productName: products.productName,
          description: products.description,
          category: categoryId._id,
          regularPrice: products.regularPrice,
          createdOn: new Date(),
          sizes: sizes,
          productImage: images,
          status: "Available",
        });
  
        await newProduct.save();
        return res.redirect("/admin/addProducts");
      } else {
        return res
          .status(400)
          .json({
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
      const limit = 4;
  
      const productData = await Product.find({
        $or: [
          { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
        ],
      }).limit(limit * 1).skip((page - 1) * limit).populate("category").exec();
  
      const count = await Product.find({
        $or: [
          { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
        ],
      }).countDocuments();
  
      const category = await Category.find({ isListed: true });
  
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
        return res
          .status(400)
          .json({
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
        description: data.description,
        category: data.category,
        regularPrice: data.regularPrice,
        sizes: sizes,
      };
  
      if (images.length > 0) {
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
        "re-image",
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
  
};
