const express = require("express")
const router = express.Router()

const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middlewares/auth")
const customController=require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController")
const orderController = require("../controllers/admin/orderController")
const couponContrller = require("../controllers/admin/couponController")
const salesReportController = require("../controllers/admin/salesReportController")

const storage = require("../helpers/multer")
const multer=require("multer")
const uploads = multer({storage:storage})


router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
router.get('/sales-data',adminAuth,adminController.salesData)

router.get("/users",adminAuth,customController.customerInfo)
router.get('/blockCustomer',adminAuth,customController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customController.customerunBlocked)

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)

router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addproducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)
router.get("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unblockProduct",adminAuth,productController.unblockProduct)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
router.post("/addProductOffer",adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
// router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)

router.get('/orderList', adminAuth, orderController.getOrderList);
router.post('/change-order-status/:orderId', adminAuth, orderController.changeOrderStatus);
//Coupon Management

//Coupon Management
router.get("/coupon",adminAuth,couponContrller.getCouponPage)
router.post("/addCoupon",adminAuth,uploads.single("couponImage"),couponContrller.addCoupon)
router.post("/deleteCoupon",adminAuth,couponContrller.deleteCoupon)
//Sales Report
router.get("/salesReport",adminAuth,salesReportController.getSalesReport)
router.post("/generateSalesReport",adminAuth,salesReportController.generateSalesReport)
router.get("/salesReportDownload",adminAuth,salesReportController.salesReportDownload)

module.exports=router