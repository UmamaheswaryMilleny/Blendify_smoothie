const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")

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

module.exports = {
    getOrderList,
    changeOrderStatus,
}