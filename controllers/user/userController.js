const Wallet = require("../../models/walletSchema")
const env=require("dotenv").config()
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")
const User = require("../../models/userSchema")
const { use } = require("passport")


const pageNotFound = async(req,res)=>{
    try{
        res.render("page-404")
    }catch(error){
        res.redirect("/pageNotFound")
    }
}



const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;

        if (user) {
            const userData = await User.findOne({ _id: user});
            return res.render("home", { user: userData});
        } else {
            return res.render("home");
        }
    } catch (error) {
        console.error("Error loading home page:", error);
        res.status(500).send("Server error");
    }
};

const loadSignup=async(req,res)=>{
    try{
        return res.render('signup')
    }catch(error){
        console.log('Home page not loading',error);
        res.status(500).send('Server Error')
    }
}

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}




async function sendVerificationEmail(email,otp){
    try{
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP: ${otp}</b>`
        })

        return info.accepted.length>0
    }catch(error){
        console.error("Error sending email",error)
        return false;
           
    }


}

const signup=async (req,res)=>{
    try{
        const {name,email,phone,password,cPassword,cReferral}=req.body
        if(password!==cPassword){
            return res.render("signup",{message:"Password not match"})
        }
        const findUser=await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User with this email already exists"})
        }
        const otp=generateOtp()

        const emailSent=await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json("email-error")
        }
        req.session.userOtp=otp;
        req.session.userData={name,phone,email,password,cReferral}
        res.render("verify-otp")
        console.log("OTP Sent otp",otp)
    }catch(error){
        console.error("signup error",error)
        res.redirect("/pageNotFound")

    }
}

function generateReferralCode(length=8){
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWYZabcdefghijklmnopqrstuvwyz0123456789"
    let referralCode=''
    for(let i=0;i<length;i++){
        const randomIndex = Math.floor(Math.random()*characters.length)
        referralCode+=characters[randomIndex]
    }
    return referralCode
}

const securePassword = async(password)=>{
    try {
        
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash

    } catch (error) {
        
    }


}



const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const userReferral = user.cReferral;
            let walletAmount = 0;
            const passwordHash = await securePassword(user.password);
            const referralCode = generateReferralCode();

            if (userReferral) {
                // Check for the referral code only if it exists
                const findUser = await User.findOne({ referalCode: userReferral });
                if (findUser) {
                    walletAmount = 100; // Add 100 to the wallet if referral code is valid
                    await User.findByIdAndUpdate(findUser._id, {
                        wallet: findUser.wallet + 100,
                    }, { new: true });
                }
            }

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                referalCode: referralCode,
                wallet: walletAmount,
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;
            console.log(req.session.user._id);

            if (walletAmount > 0) {
                let wallet = await Wallet.findOne({ user_id: req.session.user });
                console.log(wallet);
                if (!wallet) {
                    wallet = new Wallet({
                        user_id: req.session.user,
                        balance: walletAmount,
                        transactions: [],
                    });
                    await wallet.save();
                }
            }

            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const resendOTP = async(req,res)=>{
    try{
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp=generateOtp();
        req.session.userOtp=otp
        const emailSent=await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP,Please try again"})
        }
    }catch(error){
        console.error("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error.Please try again"})

    }
}

const loadLogin=async(req,res)=>{
    try{
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }
    }catch(error){
        res.redirect("pageNotFound")
    }
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!password) {
            return res.render("login", { message: "Password is required" });
        }

        const findUser = await User.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        // console.log("Password:", password);
        // console.log("Hashed Password:", findUser.password);

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password" });
        }

        req.session.user = findUser._id;
        res.redirect("/");
    } catch (error) {
        console.error("login error", error);
        res.render("login", { message: "Login failed, please try again later" });
    }
};

const logout=async(req,res)=>{
    try{
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",error)
                return res.redirect("/pageNotFound")
            }
            res.redirect("/login")
        })
    }catch(error){
        console.log("unexpected error during logout",error);
        res.redirect("/pageNotFound")
    }
}


module.exports={
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOTP,
    loadLogin,
    login,
    logout,
    generateOtp,
    sendVerificationEmail,
    securePassword
}