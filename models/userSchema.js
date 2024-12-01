const mongoose = require("mongoose");
// const { search } = require("../app");
const {Schema}=mongoose

const userSchema = new Schema({
        name:{
            type:String,
            required:true
        },
        email:{
            type:String,
            required:true,
            sparse:true,
            unique:true
        },
        phone:{
            type:String,
            required:false,
            unique:true,
            sparse:true,
            default:null
        },
        googleId:{
            type:String,
            required:false,
            unique: true,
            sparse: true, // Prevents conflicts when the field is null
        },
        password:{
            type:String,
            required:false
        },
        isBlocked:{
            type:Boolean,
            default:false
        },
        isAdmin:{
            type:Boolean,
            default:false
        },
        cart:[{
            type:Schema.Types.ObjectId,
            ref:"Cart"
        }],
        
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
        createdOn:[{
            type:Date,
            default:Date.now
        }],
        searchHistory:[
            {
                category:{
                    type:Schema.Types.ObjectId,
                    ref:"Category"
                },
                searchOn:{
                    type:Date,
                    default:Date.now
                }
            }
        ],
        
        
},{timestamps:true})

const User = mongoose.model("User",userSchema)

module.exports=User;