# Blendify

**Blendify Banner**

## Overview

Blendify is a smoothie ecommerce website built with Node.js and MongoDB, allowing users to order their favorite smoothies. The project showcases modern web development techniques with an emphasis on usability, performance, and a seamless user experience.

---

## Live Demo

[Live Website]()

---

## Key Features

### **Customer Features**

- User authentication with Google and OTP-based signup.
- Coupon functionality for discounts
- wallet option and referral rewards
- Advanced smoothie search and filtering by categories like Energy Booster, Vegan, etc.
- Responsive design for mobile, tablet, and desktop.

### **Admin Features**

- Dashboard for managing users products, categories, and orders.
- User management (view, block/unblock users).
- Analytics dashboard for revenue, sales, and user activity.
- Offer and coupon management.

---

## Technical Stack

### **Backend**

- Node.js
- Express.js
- MongoDB
- Mongoose

### **Frontend**

- EJS (Embedded JavaScript)
- CSS
- JavaScript

### **Authentication & Security**

- Passport.js
- bcrypt
- nodemailer
- Express-session

### **Additional Tools**

- Multer (Image/File uploads)
- Nodemailer (Email notifications)
- Chart.js (Analytics visualization)
- Razorpay (Payment gateway)

---

## Installation

1. **Clone the Repository**

```bash
git clone https://github.com/UmamaheswaryMilleny/Blendify_smoothie.git
```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a .env file in the root directory:

   ```env
   PORT=8080
   MONGODB_URI=your_mongodb_uri
   SESSION_SECRET=your_session_secret
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_SECRET=your_razorpay_secret
   ```

4. **Start the Server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

   ## Project Structure

```
geradfashion/
├── config/            # Configuration files
├── controllers/       # Request handlers
├── helpers/           # Utility functions
├── middlewares/       # Custom middlewares
├── models/            # Database models
├── public/            # Static files
│   ├── css/
│   ├── fonts/
│   ├── images/
│   ├── js/
│   └── styles/
│   └── uploads/
│   └── videos/
├── routes/            # API routes
├── views/             # EJS templates
└── index.js           # Entry point
```

**AUTHOR**
**Umamaheswary Milleny**

- GitHub: [@UmamaheswaryMilleny](https://github.com/UmamaheswaryMilleny)
- LinkedIn: https://www.linkedin.com/in/umamaheswary-milleny
