const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const Wallet = require("../../models/walletSchema")

const getOrderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const orders = await Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        const totalOrders = await Order.countDocuments();

        for (const order of orders) {
            const userAddressData = await Address.findOne({ userId: order.user }).lean();

            const specificAddress = userAddressData.address.find(addr => addr._id.equals(order.address));
            order.addressDetails = specificAddress;

            for (const item of order.orderedItems) {
                const product = await Product.findById(item.product).lean();
                item.productDetails = product; 
            }
        }

        res.render('admin-orders', { orders, page, totalPages: Math.ceil(totalOrders / limit) });
    } catch (error) {
        res.status(500).send("Error fetching orders");
    }
}

const changeOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const newStatus = req.body.status;

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });

        if (updatedOrder) {
            return res.json({ success: true, message: 'Order Status Changed successfully' });
        } else {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).send("Error updating order status");
    }
};

const acceptReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            console.error(`Order not found: ${orderId}`);
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.status = "Return Accepted";
        await order.save();

        // Refund the order amount to the user's wallet
        const userId = order.user;
        const refundAmount = order.finalAmount;

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
            (transaction) => transaction.description === `Refund for returned order ${orderId}`
        );

        if (!existingTransaction) {
            const transactionId = new mongoose.Types.ObjectId();
            wallet.balance += refundAmount;
            wallet.transactions.push({
                transaction_id: transactionId,
                amount: refundAmount,
                type: "credit",
                date: new Date(),
                description: `Refund for returned order`,
            });
            await wallet.save();
            console.log("Return request processed successfully and wallet updated");
        } else {
            console.log("Refund for this order has already been processed");
        }

        return res.json({ success: true, message: "Return request accepted" });
    } catch (error) {
        console.error("Error accepting return request:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const denyReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            console.error(`Order not found: ${orderId}`);
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.status = "Return Denied";
        await order.save();

        return res.json({ success: true, message: "Return request denied" });
    } catch (error) {
        console.error("Error denying return request:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    getOrderList,
    changeOrderStatus,
    acceptReturnRequest,
    denyReturnRequest,
}