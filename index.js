const env = require("dotenv").config()
// console.//
const express = require("express")
const session=require("express-session")
const app = express();
const nocache = require('nocache');
const db=require("./config/db")
const path = require("path")
const userRouter=require("./routes/userRouter")
const adminRouter=require('./routes/adminRouter')
const passport=require("./config/passport")
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(nocache())
app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname, "public")))

app.use(session({
    secret:process.env.SESSION_SECRET  || 'mySecret',
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))


app.use(passport.initialize())
app.use(passport.session())

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})




app.use("/",userRouter)
app.use('/admin',adminRouter)

const PORT = 8080 || process.env.PORT
app.listen(PORT,()=>{
    console.log('http://localhost:8080')
})

module.exports=app;