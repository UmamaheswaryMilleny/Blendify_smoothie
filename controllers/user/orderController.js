const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");

const getMyOrders = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    console.log(userId);
    const orders = await Order.find({ user: userId }).lean();

    if (orders.length < 1) {
      return res.render("my-orders", { orders: [] });
    }

    const userAddressData = await Address.findOne({ userId }).lean();

    // If no address document exists for the user, set address details to null
    const addressMap = userAddressData
      ? userAddressData.address.reduce((map, addr) => {
          map[addr._id.toString()] = addr;
          return map;
        }, {})
      : {};

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        // Assign address details
        order.addressDetails = addressMap[order.address?.toString()] || null;

        const enrichedItems = await Promise.all(
          order.orderedItems.map(async (item) => {
            const product = await Product.findById(item.productId).lean();
            return { ...item, productDetails: product || null };
          })
        );

        order.orderedItems = enrichedItems;
        const deliveryCharge = order.deliveryCharge || 50;
        order.totalAmountWithDelivery = order.finalAmount + deliveryCharge;
        order.deliveryCharge = deliveryCharge;
        return order;
      })
    );
    enrichedOrders.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.render("my-orders", { orders: enrichedOrders, user: userData });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .send("An error occurred while fetching orders. Please try again later.");
  }
};
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required.",
      });
    }
    const order = await Order.findById(orderId).populate("orderedItems.product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "Pending" || order.status === "Placed") {
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product._id);
        if (product) {
          const sizeInfo = product.sizes.find((s) => s.size === item.size);
          if (sizeInfo) {
            sizeInfo.quantity += item.quantity;
            await product.save();
          }
        }
      }

      if (order.paymentMethod !== "Cash on Delivery") {
        const userId = order.user;
        const deliveryCharge = order.deliveryCharge || 50;
        const refundAmount = order.finalAmount + deliveryCharge;

        let wallet = await Wallet.findOne({ user_id: userId });

        if (!wallet) {
          wallet = new Wallet({
            user_id: userId,
            balance: 0,
            transactions: [],
          });
        }

        // Check if a refund transaction for this order already exists
        const existingTransaction = wallet.transactions.find(
          (transaction) => transaction.description === `Refund for canceled order ${orderId}`
        );

        if (!existingTransaction) {
          const transactionId = new mongoose.Types.ObjectId();
          wallet.balance += refundAmount;
          wallet.transactions.push({
            transaction_id: transactionId,
            amount: refundAmount,
            type: "credit",
            date: new Date(),
            description: `Refund for canceled order ${orderId}`,
          });
          await wallet.save();
          console.log("Order cancellation processed successfully and wallet updated");
        } else {
          console.log("Refund for this order has already been processed");
        }
      } else {
        console.log("Order cancellation does not require refund to wallet as it was Cash on Delivery");
      }

      // Update order status to "Canceled" and save the cancellation reason
      order.status = "Canceled";
      order.cancellationReason = reason;
      await order.save();

      return res.json({
        success: true,
        message: "Order canceled successfully",
      });
    } else {
      return res.json({ success: false, message: "Order cannot be canceled" });
    }
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    console.log(orderId);

    if (!order) {
      return res.redirect("/pageNotFound");
    }

    const addressDoc = await Address.findOne({ userId: userId });
    console.log(addressDoc);

    if (!addressDoc) {
      return res.redirect("/pageNotFound");
    }

    const addressIdToCheck = order.address;
    const specificAddress = addressDoc.address.find((addr) =>
      addr._id.equals(addressIdToCheck)
    );
    const deliveryCharge = order.deliveryCharge || 50;
    const totalAmountWithDelivery = order.finalAmount + deliveryCharge;
    res.render("order-details", {
      order,
      user: userData,
      orderedItems: order.orderedItems || [],
      totalPrice: order.totalprice,
      specificAddress,
      deliveryCharge,
      totalAmountWithDelivery,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res
        .status(400)
        .json({ success: false, message: "Order Not Found" });
    }

    order.status = "Return Request";
    order.save();

    return res
      .status(200)
      .json({ success: true, message: "Return Requested Successfully" });
  } catch (error) {
    console.error("Error requesting return order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {
  getMyOrders,
  cancelOrder,
  getOrderDetails,
  returnOrder,
};
