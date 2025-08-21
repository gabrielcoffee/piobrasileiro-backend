import multer from 'multer';

// Configure multer to store the uploaded file in memory as a buffer
const upload = multer({ storage: multer.memoryStorage() }).single('avatar_image');

// Middleware to parse multipart/form-data requests with an 'avatar_image' field
export default (req, res, next) => {
    // Multer processes the request, extracting the file from the 'avatar_image' field
    // The binary data (from uploadAvatar's FormData) is stored in req.file.buffer
    upload(req, res, (err) => {
        if (err) {
            // Handle multer errors (e.g., file too large, wrong format)
            console.error('Multer error:', err);
            return res.status(400).json({ message: 'Failed to process image' });
        }
        // If successful, pass control to updatePerfilAvatar, with req.file.buffer ready
        next();
    });
};