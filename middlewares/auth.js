const User=require("../models/userSchema")

const userAuth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
            .then(data=>{
                if(data && !data.isBlocked){
                    next();
                }else{
                    res.redirect("/login")
                }
            }).catch(error=>{
                console.log("Error in user auth middleware");
                res.status(500).send("Internal Server error")
            })
        }else{
            res.redirect("/login")
        }    
}

module.exports={
    userAuth
}