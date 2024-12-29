const mongoose = require("mongoose")
const {Schema} = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
        required: true
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        productName:{
            type:String,
            required:true
        },
        size:{
            type:String,
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalprice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    deliveryCharge: { // Add the deliveryCharge field here
        type: Number,
        default: 0
    },
    cancellationReason: {
        type: String, // Field to store the reason for cancellation
      },
    address:{
        type:Schema.Types.ObjectId,
        ref:"Address",
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Placed', 'Delivered', 'Canceled', 'Return Request', 'Returned'], // Add "Return Request" and "Returned"
    }
    ,
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Schema.Types.ObjectId,
        ref:"Coupon",
        required:false
    },
    paymentMethod:{
        type:String,
        required:true
    },
    razorpayOrderId:{
        type:String,
        required:false
    },
    returnRequest: {
        type: Boolean, // Flag to indicate if a return request has been made
        default: false,
      },
      returnReason: {
        type: String, // Field to store the reason for the return
      },
      returnStatus: {
        type: String,
        enum: ["Requested", "Approved", "Rejected", "Completed"], // Different stages of the return process
        default: "Requested",
      },
      returnProcessedOn: {
        type: Date, // The date when the return was processed
      }
},{ timestamps: true })


const Order = mongoose.model("Order",orderSchema)

module.exports = Order