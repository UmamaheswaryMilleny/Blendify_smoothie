const Address = require("../../models/addressSchema")
const Cart = require("../../models/cartSchema")
const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")

const env = require('dotenv').config()




  const getCheckoutPage = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user);
        const userId = req.session.user;

        const addresses = await Address.findOne({ userId: userId });

        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        const cartItems = cart ? cart.items : [];
        const totalPrice = cartItems.reduce((total, item) => total + item.totalPrice, 0);

        let appliedCouponCode = '';
        if (cart && cart.couponApplied) {
            const appliedCoupon = await Coupon.findById(cart.couponApplied);
            if (appliedCoupon) {
                appliedCouponCode = appliedCoupon.code;
            }
        }

        res.render("checkout", {
            addresses,
            cartItems,
            totalPrice,
            user: userData,
            discount: cart ? cart.discount : 0,
            appliedCouponCode,
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
    }
};

const placeOrder = async (req, res) => {
    try {
        const { selectedAddress, paymentMethod} = req.body;
        const userId = req.session.user;

        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

        let totalPrice = 0;

        for (const item of cart.items) {
            totalPrice += item.productId.regularPrice * item.quantity;

            const product = await Product.findById(item.productId._id);

            const sizeInfo = product.sizes.find(s => s.size === item.size);

            if (!sizeInfo) {
                return res.status(400).json({ success: false, message: `Size ${item.size} not found for product: ${product.productName}` });
            }

            if (sizeInfo.quantity < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for size ${item.size} of product: ${product.productName}` });
            }

            sizeInfo.quantity -= item.quantity;

            await product.save();
        }

        if (paymentMethod === 'Cash on Delivery' && totalPrice>1000) {
            return res.status(400).json({ success: false, error: "Amount above 1000 is not allowed for cash on delivery" });
        }

        const discount = cart.discount;
        const couponApplied = cart.couponApplied
        let finalAmount = totalPrice - discount

        
        const newOrder = new Order({
            orderedItems: cart.items.map(item => ({
                product: item.productId._id,
                productName:item.productId.productName, 
                size: item.size,
                quantity: item.quantity,
                price: item.productId.regularPrice * item.quantity
            })),
            user: userId,
            totalprice: totalPrice,
            finalAmount: finalAmount < totalPrice ? finalAmount : totalPrice,
            address: selectedAddress,
            invoiceDate: new Date(),
            status: 'Pending',
            couponApplied: couponApplied ? couponApplied._id : null,
            paymentMethod: paymentMethod,
            discount: totalPrice - finalAmount
        });
        
        cart.items = [];
        await cart.save();        

        if (paymentMethod === 'Online Payment') {
            const options = {
                amount: finalAmount * 100,
                currency: "INR",
                receipt: `${newOrder._id}`,
                payment_capture: 1
            };
            
            const razorpayOrder = await razorpayInstance.orders.create(options);

            newOrder.razorpayOrderId = razorpayOrder.id;
            await newOrder.save(); 

            return res.json({
                success: true,
                orderId: razorpayOrder.id, 
                finalAmount: newOrder.finalAmount,
                razorpayKey: process.env.RAZORPAY_KEY_ID,
                message: newOrder.orderId 
            });
        }
        else if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({user_id:userId})
            if (!wallet) {
                return res.json({success:false,message:"Wallet Not Found"})
            }

            let balance = wallet.balance

            if (balance<newOrder.finalAmount) {
                return res.json({success:false,message:"Insufficient Balance in Your Wallet"})
            }

            wallet.balance -= newOrder.finalAmount

            wallet.transactions.push({
                amount: newOrder.finalAmount,
                type: 'debit',
                date: new Date(),
                description: 'Order Payment'
            });
            await wallet.save();

            newOrder.status = 'Placed'
            await newOrder.save();
            return res.status(200).json({
                success: true,
                message: newOrder.orderId
            });
        }
        else {
            newOrder.status = 'Placed'

            await newOrder.save();
            return res.status(200).json({
                success: true,
                message: newOrder.orderId
            });
        }                
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
};



const orderConfirmation = async (req,res) => {
    
    try {
        const userId = req.session.user

        const orderId = String(req.params.orderId);
        console.log(orderId);
        
        const order = await Order.findOne({ orderId:orderId })
        console.log(order);
        

        if (!order) {
            return res.redirect('/pageNotFound');
        }

        const addressDoc = await Address.findOne({userId:userId});
        console.log(addressDoc);
        

        if (!addressDoc) {
            return res.redirect('/pageNotFound');
        }

        const addressIdToCheck = order.address;
        const specificAddress = addressDoc.address.find(addr => addr._id.equals(addressIdToCheck));
        
        res.render('order-confirmation', {
            order,
            orderedItems: order.orderedItems || [],
            totalPrice: order.totalprice,
            specificAddress
        });
    } catch (error) {
        console.error('Error fetching order or rendering:', error);
        res.redirect('/pageNotFound');
    }
};





module.exports = {
    getCheckoutPage,
    placeOrder,
    orderConfirmation,

}