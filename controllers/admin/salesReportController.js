const Order = require("../../models/orderSchema")

const getSalesReport = async (req, res) => {
    try {
        res.render("salesReport", {
            overallSalesCount: 0,
            overallOrderAmount: 0,
            overallDiscount: 0
        });
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
};

const generateSalesReport = async (req, res) => {
    console.log("Request received for generating sales report");

    try {
        const { startDate, endDate, filter } = req.body;
        console.log("Received Dates:", startDate, endDate, filter);

        let query = {};
        const now = new Date();

        if (filter) {
            let filterDate;
            switch (filter) {
                case '1 Day':
                    filterDate = new Date(now);
                    filterDate.setDate(now.getDate() - 1);
                    break;
                case '1 Week':
                    filterDate = new Date(now);
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case '1 Month':
                    filterDate = new Date(now);
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
                case '1 Year':
                    filterDate = new Date(now);
                    filterDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid filter' });
            }
            query.createdOn = { $gte: filterDate };
        } else if (startDate && endDate) {
            query.createdOn = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        } else {
            return res.status(400).json({ error: 'Please provide either a filter or a valid date range' });
        }

        const orders = await Order.find(query).populate("user", "name").populate("orderedItems.product", "name").exec();

        if (orders.length > 0) {
            const overallSalesCount = orders.length;
            const overallOrderAmount = orders.reduce((total, order) => total + order.totalprice, 0);
            const overallDiscount = orders.reduce((total, order) => total + order.discount, 0);
            const overallDeliveryCharge = orders.reduce((total, order) => total + order.deliveryCharge, 0);
            const finalAmount = orders.reduce((total, order) => total + order.finalAmount, 0);

            req.session.salesReportData = {
                overallSalesCount,
                overallOrderAmount,
                overallDiscount,
                overallDeliveryCharge,
                finalAmount,
                orders,
                filter: filter || null,
                startDate: startDate || null,
                endDate: endDate || null
            };

            return res.json({
                redirectUrl: '/admin/salesReportDownload',
                overallSalesCount,
                overallOrderAmount,
                overallDiscount,
                overallDeliveryCharge,
                finalAmount,
                orders
            });
        } else {
            req.session.salesReportData = {
                overallSalesCount: 0,
                overallOrderAmount: 0,
                overallDiscount: 0,
                overallDeliveryCharge: 0,
                finalAmount: 0,
                orders: [],
                filter: filter || null,
                startDate: startDate || null,
                endDate: endDate || null
            };

            return res.json({
                redirectUrl: '/admin/salesReportDownload'
            });
        }
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const salesReportDownload = async (req, res) => {
    try {
        const { overallSalesCount, overallOrderAmount, overallDiscount, overallDeliveryCharge, finalAmount, orders, filter, startDate, endDate } =
            req.session.salesReportData || {};

        if (!orders || overallSalesCount === undefined || overallOrderAmount === undefined || overallDiscount === undefined || overallDeliveryCharge === undefined || finalAmount === undefined) {
            return res.redirect('/admin/pageerror');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedOrders = orders.slice().reverse().slice(startIndex, endIndex);
        const totalPages = Math.ceil(orders.length / limit);

        res.render("salesReportDownload", {
            overallSalesCount,
            overallOrderAmount,
            overallDiscount,
            overallDeliveryCharge,
            finalAmount,
            orders: paginatedOrders,
            filter,
            startDate,
            endDate,
            currentPage: page,
            totalPages,
            ordersJson: JSON.stringify(orders).replace(/</g, '\\u003c')
        });
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};

module.exports = {
    getSalesReport,
    generateSalesReport,
    salesReportDownload
}