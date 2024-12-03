const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");

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

        res.render("checkout", {
            addresses: addresses || { address: [] }, // Ensure addresses are always defined
            cartItems,
            totalPrice,
            user: userData,
        });
    } catch (error) {
        console.error("Error loading checkout page:", error.message);
        res.redirect("/pageNotFound");
    }
};

const placeOrder = async (req, res) => {
    try {
        const { selectedAddress } = req.body;
        const userId = req.session.user;

        if (!selectedAddress || !userId) {
            return res.status(400).json({ success: false, message: "Invalid request" });
        }

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty" });
        }

        const totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        const newOrder = new Order({
            user: userId,
            address: selectedAddress,
            orderedItems: cart.items.map((item) => ({
                product: item.productId._id,
                productName: item.productId.productName,
                size: item.size,
                quantity: item.quantity,
                price: item.totalPrice,
            })),
            totalprice: totalPrice,
            finalAmount: totalPrice, // No discounts or coupons, so finalAmount = totalPrice
            paymentMethod: "Cash on Delivery",
            status: "Pending",
        });

        await newOrder.save();

        // Clear the cart after placing the order
        cart.items = [];
        await cart.save();

        res.json({ success: true, message: newOrder._id });
    } catch (error) {
        console.error("Error placing order:", error.message);
        res.status(500).json({ success: false, message: "Failed to place order" });
    }
};

const orderConfirmation = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = String(req.params.orderId);

        const order = await Order.findById(orderId).populate("orderedItems.product");
        if (!order) {
            return res.redirect("/pageNotFound");
        }

        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            return res.redirect("/pageNotFound");
        }

        const addressIdToCheck = order.address;
        const specificAddress = addressDoc.address.find((addr) => addr._id.equals(addressIdToCheck));

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

module.exports = {
    getCheckoutPage,
    placeOrder,
    orderConfirmation,
};
