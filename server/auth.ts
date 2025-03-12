
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import pool from '../db/database'; // Ensure correct DB connection

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"; // Use a secure environment variable

// Middleware to authenticate users
export function authenticateUser(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Access denied, no token provided." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });
        req.user = user;
        next();
    });
}

// Generate JWT token for a user
export function generateToken(user: { id: number; role: string }) {
    return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

// Register user
export async function registerUser(req: Request, res: Response) {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role",
            [email, hashedPassword, role || 'user']
        );

        res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Registration failed" });
    }
}

// Login user
export async function loginUser(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = generateToken({ id: user.id, role: user.role });
        res.json({ token });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Login failed" });
    }
}

// Middleware to check admin access
export function authorizeAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied, admin required." });
    }
    next();
}
