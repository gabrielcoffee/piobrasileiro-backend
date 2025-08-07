import jwt from 'jsonwebtoken';

function authMiddleware(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        })
    }

    const result = pool.query("SELECT * from user_auth where email = $1", [email]);
    if (result.rows.length == 0) {
        res.status(401).json({
            success: false,
            message: "Invalid email"
        })
    }
        
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
}