export default async function adminMiddleware(req, res, next) {

    if (req.userRole !== 'adm') {
        return res.status(403).json({
            message: "You are not authorized to access this resource"
        })
    }

    next();
}