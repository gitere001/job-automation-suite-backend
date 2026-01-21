// controllers/adminController.js
import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";
import User from "../models/User.js";


const generateTokens = (admin) => {
	const payload = {
		id: admin._id,  // Mongoose uses _id



	};

	const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn: "6h"
	});

	const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "6h"
	});

	return { accessToken, refreshToken };
};

const verifyPassword = async (inputPassword, hashedPassword) => {
	return await bcrypt.compare(inputPassword, hashedPassword);
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		console.log("Login attempt:", email, password);

		if (!email || !password) {
			return res.status(400).json({ message: "Email and password are required" });
		}

		// CHANGE THIS LINE - Mongoose doesn't use "where"
		const admin = await User.findOne({ email: email }); // or just { email }

		if (!admin) {
			console.log("❌ User not found:", email);
			return res.status(401).json({ message: "Invalid credentials" });
		}

		console.log("✅ User found, comparing password...");
		console.log("Stored hash:", admin.password.substring(0, 20) + "...");

		const isPasswordValid = await verifyPassword(password, admin.password);

		if (!isPasswordValid) {
			console.log("❌ Password mismatch");
			return res.status(401).json({ message: "Invalid credentials" });
		}

		console.log("✅ Password valid, generating tokens...");
		const { accessToken, refreshToken } = generateTokens(admin);

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			maxAge: 6 * 60 * 60 * 1000,
		});

		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			maxAge: 6 * 60 * 60 * 1000,
		});

		return res.status(200).json({
			message: "Login successful",
			admin: {
				id: admin._id, // Mongoose uses _id, not id
				name: admin.name,
				email: admin.email,
			},
		});
	} catch (error) {
		console.error("❌ Error logging in:", error);
		res.status(500).json({ message: "Server error while logging in" });
	}
};





export const getAdminProfile = async (req, res) => {
	try {
		// Assuming you have middleware that sets req.admin from the JWT
		const adminId = req.admin.id;

		const admin = await User.findById(adminId).select('_id name email');

		if (!admin) {
			return res.status(404).json({ message: "Admin not found" });
		}
		const response = {
			id: admin._id,
			name: admin.name,
			email: admin.email,

		};

		return res.status(200).json({ admin: response });
	} catch (error) {
		console.error("❌ Error fetching admin profile:", error);
		res.status(500).json({ message: "Server error while fetching profile" });
	}
};

export const logout = (req, res) => {
	try {
		// Clear the cookies
		res.clearCookie("accessToken", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		});

		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		});

		return res.status(200).json({ message: "Logout successful" });
	} catch (error) {
		console.error("❌ Error logging out:", error);
		return res.status(500).json({ message: "Server error while logging out" });
	}
};

