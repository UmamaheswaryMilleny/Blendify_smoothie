const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middlewares/auth")
const customController=require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController=require("../controllers/admin/productController")

const storage = require("../helpers/multer")
const multer=require("multer")
const uploads = multer({storage:storage})


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
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory)

router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addproducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)
router.get("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unblockProduct",adminAuth,productController.unblockProduct)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
// router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)



module.exports=router