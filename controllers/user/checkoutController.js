const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const env = require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { log } = require("console");
const mongoose = require("mongoose");


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.redirect("/login");
        }

        const addresses = await Address.findOne({ userId });
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        const cartItems = cart ? cart.items : [];
        const totalPrice = cartItems.reduce((total, item) => total + item.totalPrice, 0);
        
        
    let appliedCouponCode = "";
    if (cart && cart.couponApplied) {
      const appliedCoupon = await Coupon.findById(cart.couponApplied);
      if (appliedCoupon) {
        appliedCouponCode = appliedCoupon.code;
      }
    }

        res.render("checkout", {
            addresses: addresses || { address: [] }, // Ensure addresses are always defined
            cartItems,
            totalPrice,
            user: userData,
            discount: cart ? cart.discount : 0,
            appliedCouponCode,
        });
    } catch (error) {
        console.error("Error loading checkout page:", error.message);
        res.redirect("/pageNotFound");
    }
};

// const placeOrder = async (req, res) => {
//     try {
//         const { selectedAddress } = req.body;
//         const userId = req.session.user;

//         if (!selectedAddress || !userId) {
//             return res.status(400).json({ success: false, message: "Invalid request" });
//         }

//         const cart = await Cart.findOne({ userId }).populate("items.productId");
//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: "Your cart is empty" });
//         }

//         const totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);

//         const newOrder = new Order({
//             user: userId,
//             address: selectedAddress,
//             orderedItems: cart.items.map((item) => ({
//                 product: item.productId._id,
//                 productName: item.productId.productName,
//                 size: item.size,
//                 quantity: item.quantity,
//                 price: item.totalPrice,
//             })),
//             totalprice: totalPrice,
//             finalAmount: totalPrice, // No discounts or coupons, so finalAmount = totalPrice
//             paymentMethod: "Cash on Delivery",
//             status: "Pending",
//         });

//         await newOrder.save();

//         // Clear the cart after placing the order
//         cart.items = [];
//         await cart.save();

//         res.json({ success: true, message: newOrder._id });
//     } catch (error) {
//         console.error("Error placing order:", error.message);
//         res.status(500).json({ success: false, message: "Failed to place order" });
//     }
// };


const placeOrder = async (req, res) => {
  try {
      const { selectedAddress, paymentMethod } = req.body;
      const userId = req.session.user;

      const cart = await Cart.findOne({ userId }).populate("items.productId");

      if (!cart || cart.items.length === 0) {
          return res.status(400).json({ success: false, message: "Your cart is empty" });
      }

      let totalPrice = cart.items.reduce((total, item) => total + item.productId.salePrice * item.quantity, 0);

      // Apply any existing discounts
      const discount = cart.discount || 0;
      const finalAmount = totalPrice - discount;

      // Create a new order
      const newOrder = new Order({
          user: userId,
          orderedItems: cart.items.map((item) => ({
              product: item.productId._id,
              productName: item.productId.productName,
              size: item.size,
              quantity: item.quantity,
              price: item.productId.salePrice * item.quantity,
          })),
          totalprice: totalPrice,
          finalAmount,
          address: selectedAddress,
          status: paymentMethod === "Cash on Delivery" ? "Placed" : "Pending",
          paymentMethod,
          discount,
      });

      // Wallet Payment Logic
      if (paymentMethod === "Wallet") {
          const wallet = await Wallet.findOne({ user_id: userId });

          if (!wallet || wallet.balance < finalAmount) {
              return res.status(400).json({ success: false, message: "Insufficient Wallet Balance" });
          }

          wallet.balance -= finalAmount;
          wallet.transactions.push({
              amount: finalAmount,
              type: "debit",
              date: new Date(),
              description: "Order Payment",
          });
          await wallet.save();

          newOrder.status = "Placed"; // Mark as placed for wallet payments
      }

      // Save the order
      const savedOrder = await newOrder.save();

      // Clear the cart
      cart.items = [];
      cart.discount = 0;
      cart.couponApplied = null;
      await cart.save();

      // Respond based on payment method
      if (paymentMethod === "Cash on Delivery") {
          return res.status(200).json({
              success: true,
              message: savedOrder._id, // Use MongoDB's ObjectId for further operations
          });
      }

      if (paymentMethod === "Wallet") {
          return res.status(200).json({
              success: true,
              message: savedOrder._id,
          });
      }
  } catch (error) {
      console.error("Error placing order:", error.message);
      res.status(500).json({ success: false, message: "Failed to place order" });
  }
};


  const verifyPayment = async (req, res) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
        req.body;
  
      console.log("Received values:");
      console.log("razorpay_payment_id:", razorpay_payment_id);
      console.log("razorpay_order_id:", razorpay_order_id);
      console.log("razorpay_signature:", razorpay_signature);
  
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
  
      console.log("Generated signature:", generatedSignature);
      console.log("Signature from Razorpay:", razorpay_signature);
  
      if (generatedSignature === razorpay_signature) {
        const order = await Order.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { status: "Placed" },
          { new: true }
        );
  
        if (!order) {
          console.log(
            "Order not found for Razorpay order ID:",
            razorpay_order_id
          );
          return res
            .status(404)
            .json({ success: false, message: "Order not found" });
        }
  
        return res.status(200).json({
          success: true,
          message: `${order.orderId}`,
          orderId: order.orderId,
        });
      } else {
        console.log("Invalid signature for Razorpay payment verification.");
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment signature" });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res
        .status(500)
        .json({ success: false, message: "Payment verification failed", error });
    }
  };

  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

  const orderConfirmation = async (req, res) => {
      try {
          const userId = req.session.user;
          const orderId = req.params.orderId; // Get orderId from the URL
  
          // Validate the orderId
          if (!isValidObjectId(orderId)) {
              return res.redirect("/pageNotFound");
          }
  
          // Fetch the order
          const order = await Order.findById(orderId).populate("orderedItems.product");
          if (!order) {
              return res.redirect("/pageNotFound");
          }
  
          // Fetch user addresses
          const addressDoc = await Address.findOne({ userId });
          if (!addressDoc) {
              return res.redirect("/pageNotFound");
          }
  
          const specificAddress = addressDoc.address.find((addr) => addr._id.equals(order.address));
  
          // Render the order confirmation page
          res.render("order-confirmation", {
              order,
              orderedItems: order.orderedItems || [],
              totalPrice: order.totalprice,
              specificAddress,
          });
      } catch (error) {
          console.error("Error fetching order or rendering:", error.message);
          res.redirect("/pageNotFound");
      }
  };

const paymentFailed = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      res.render("payment-failed", { orderId });
    } catch (error) {
      console.error("Error loading payment failed page:", error);
      res.status(500).send("An error occurred");
    }
  };

  const retryPayment = async (req, res) => {
    console.log("req recieved");
  
    try {
      const { orderId } = req.params;
      console.log(orderId);
  
      const order = await Order.findOne({ orderId });
  
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }
  
      const options = {
        amount: order.finalAmount * 100,
        currency: "INR",
        receipt: `${order._id}`,
        payment_capture: 1,
      };
  
      const razorpayOrder = await razorpayInstance.orders.create(options);
  
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
  
      console.log("order saved successfully", {
        orderId: razorpayOrder.id,
        finalAmount: order.finalAmount,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        message: order.orderId,
      });
  
      return res.json({
        success: true,
        orderId: razorpayOrder.id,
        finalAmount: order.finalAmount,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        message: order.orderId,
      });
    } catch (error) {
      console.error("Error in retrying payment:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to initialize retry payment" });
    }
  };
  
  const verifyRetryPayment = async (req, res) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
        req.body;
  
      console.log("Retry Payment Verification details received:", {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      });
  
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Incomplete payment verification details",
          });
      }
  
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
  
      console.log("Generated signature:", generatedSignature);
      console.log("Signature from Razorpay:", razorpay_signature);
  
      if (generatedSignature === razorpay_signature) {
        const order = await Order.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { status: "Placed" },
          { new: true }
        );
  
        if (!order) {
          console.log(
            "Order not found for Razorpay order ID:",
            razorpay_order_id
          );
          return res
            .status(404)
            .json({ success: false, message: "Order not found" });
        }
  
        console.log("Payment verified successfully for order:", order.orderId);
        return res.status(200).json({
          success: true,
          message: `Payment successful for order ${order.orderId}`,
          orderId: order.orderId,
        });
      } else {
        console.log(
          "Signature mismatch for Razorpay payment retry verification."
        );
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment signature" });
      }
    } catch (error) {
      console.error("Error verifying retry payment:", error.message);
      return res
        .status(500)
        .json({
          success: false,
          message: "Retry payment verification failed",
          error: error.message,
        });
    }
  };

module.exports = {
    getCheckoutPage,
    placeOrder,
    verifyPayment,
    orderConfirmation,
    paymentFailed,
    retryPayment,
    verifyRetryPayment,
};
