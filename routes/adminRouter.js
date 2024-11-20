const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middlewares/auth")
const customController=require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController")

const multer=require("multer")


router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)

router.get("/users",adminAuth,customController.customerInfo)
router.get('/blockCustomer',adminAuth,customController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customController.customerunBlocked)

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)


router.get("/addProducts",adminAuth,productController.getProductAddPage)
// router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)



module.exports=router