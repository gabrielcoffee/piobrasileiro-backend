import jwt from 'jsonwebtoken';

async function authMiddleware(req, res, next) {

    // Get the token from the header (from client)
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({
            message: 'No token provided'
        })
    }
    
    // The request (still in the server) gets the id and role
    // from the token verification, using the secret only the 
    // server has access to.
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({
            message: "Invalid token"
        });
    }
}

export default authMiddleware;