const express = require("express")
const router = express.Router()
const userController=require("../controllers/user/userController");
const passport = require("passport");
const {userAuth,adminAuth} = require("../middlewares/auth")
const shopController = require("../controllers/user/shopController")

router.get("/pageNotFound",userController.pageNotFound);

router.get("/",userController.loadHomepage)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOTP);
router.get("/logout",userController.logout)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user
    res.redirect('/')
})

router.get("/login",userController.loadLogin)
router.post("/login",userController.login)

router.get("/shop",userAuth,shopController.getShopPage)
router.get("/productDetails",userAuth,shopController.getProductDetails)
router.get("/products",userAuth,shopController.sortProducts)

module.exports=router 