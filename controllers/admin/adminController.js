const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Order = require("../../models/orderSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { message: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });

    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        return res.redirect("/admin/login");
      }
    } else {
      return res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("/admin/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  try {
    if (req.session.admin) {
      const orders = await Order.find({ status: { $ne: "Canceled" } }).populate(
        {
          path: "orderedItems.product",
          populate: [{ path: "category", select: "_id name" }],
        }
      );
      const productSales = {};
      const categorySales = {};

      orders.forEach((order) => {
        order.orderedItems.forEach((item) => {
            if (item.product) {
                productSales[item.product._id] = (productSales[item.product._id] || 0) + item.quantity;

                if (item.product.category) {
                    const categoryId = item.product.category._id.toString();
                    categorySales[categoryId] = (categorySales[categoryId] || 0) + item.quantity;
                }
            }
        });
    });


      const products = await Product.find({});
      const categories = await Category.find({});

      return res.render("dashboard", {
        products,
        categories,
        productSales,
        categorySales,
      });
    }
  } catch (error) {
    res.redirect("/admin/pageerror");
    console.error(error);
  }
};

const salesData = async (req, res) => {
  try {
      const { filter } = req.query;

      const currentDate = new Date();
      let startDate, endDate, groupFormat, labels = [];

      if (filter === 'yearly') {
          startDate = new Date(2024, 0, 1);
          endDate = new Date(2025, 0, 1);
          groupFormat = { $year: "$createdOn" };
      } else if (filter === 'monthly') {
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
          groupFormat = { $month: "$createdOn" };
      } else if (filter === 'weekly') {
          const weeksToShow = 4;
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - (7 * (weeksToShow - 1)));
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
          groupFormat = { $week: "$createdOn" };
      }

      const data = await Order.aggregate([
          {
              $match: {
                  createdOn: { $gte: startDate, $lt: endDate },
                  status: { $ne: "Canceled" },
              },
          },
          {
              $group: {
                  _id: groupFormat,
                  totalRevenue: { $sum: "$finalAmount" },
                  totalOrders: { $sum: 1 },
              },
          },
          { $sort: { _id: 1 } },
      ]);

      if (filter === 'yearly') {
          labels = ['2024'];
      } else if (filter === 'monthly') {
          labels = Array.from({ length: 2 }, (_, i) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (1 - i));
              return date.toLocaleString('default', { month: 'long' });
          });
      } else if (filter === 'weekly') {
          labels = data.map((_, index) => `Week ${index + 1}`);
      }

      const revenueData = data.map(item => item.totalRevenue);
      const orderData = data.map(item => item.totalOrders);

      res.json({ labels, revenueData, orderData });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sales data" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session", err);
        return res.redirect("/admin/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("Unexpected error during logout", error);
    res.redirect("/admin/pageerror");
  }
};

module.exports = {
  pageerror,
  loadLogin,
  login,
  loadDashboard,
  logout,
  salesData
};
