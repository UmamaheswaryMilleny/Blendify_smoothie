const User = require('../models/userSchema');

const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          req.user = data;
          next();
        } else {
          res.redirect('/logout');
        }
      })
      .catch((error) => {
        console.log('Error in user auth middleware');
        res.status(500).send('Internal Server error');
      });
  } else {
    res.redirect('/login');
  }
};

const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data && req.session.admin) {
        next();
      } else {
        res.redirect('/admin/login');
      }
    })
    .catch((error) => {
      console.log('Error in admin auth middleware');
      res.status(500).send('Internal server error');
    });
};

module.exports = {
  userAuth,
  adminAuth,
};
