const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId).populate('orderedItems.product');  
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status === 'Pending' || order.status === 'Placed') {
            for (const item of order.orderedItems) {
                const product = await Product.findById(item.product._id);

                if (product) {
                    const sizeInfo = product.sizes.find(s => s.size === item.size);

                    if (sizeInfo) {
                        sizeInfo.quantity += item.quantity;
                        await product.save();
                    }
                }
            }

            if (order.paymentMethod !== 'Cash on Delivery') {
                const userId = order.user;
                const refundAmount = order.finalAmount;

                let wallet = await Wallet.findOne({ user_id: userId });

                if (!wallet) {
                    wallet = new Wallet({
                        user_id: userId,
                        balance: 0,
                        transactions: []
                    });
                }

                wallet.balance += refundAmount;

                wallet.transactions.push({
                    amount: refundAmount,
                    date: new Date(),
                    description: 'Refund for canceled order'
                });

                await wallet.save();
            } else {
                return res.json({ success: false, message: 'Order cancellation does not require refund to wallet as it was Cash on Delivery' });
            }

            order.status = 'Canceled';
            await order.save();
            return res.json({ success: true, message: 'Order canceled successfully' });
        } else {
            return res.json({ success: false, message: 'Order cannot be canceled' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};