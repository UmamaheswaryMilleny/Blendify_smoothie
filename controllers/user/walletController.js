const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');

const getWalletPage = async (req, res) => {
  try {
    const userId = req.session.user; // Retrieve logged-in user ID from session

    // Fetch the user data
    const userData = await User.findById(userId);
    if (!userData) {
      return res.redirect('/login');
    }

    // Find or create the wallet for the user
    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = new Wallet({
        user_id: userId,
        balance: 0, // Default balance
        transactions: [], // Empty transactions
      });
      await wallet.save(); // Save the new wallet to the database
    }
    wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Render the wallet page
    res.render('wallet', { user: userData, wallet });
  } catch (error) {
    console.error('Error in getWalletPage:', error.message);
    res.redirect('/pageNotFound');
  }
};

// const getWalletPage = async (req,res) => {
//     try {
//         const userId = req.session.user
//         const userData = await User.findOne({ _id: userId});
//         const wallet = await Wallet.findOne({user_id:userId})

//         if (!wallet) {
//             return res.json({success:false,error:"Wallet Not Found"})
//         }

//         res.render("wallet",{user:userData,wallet})
//     } catch (error) {
//         res.redirect("/pageNotFound")
//     }
// }

module.exports = {
  getWalletPage,
};
