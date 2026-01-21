// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.cookies.refreshToken; // using refresh token from cookies


    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // Attach the decoded payload to req.admin
    req.admin = {
      id: decoded.id,

    };

    next(); // proceed to the next middleware / route handler
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};