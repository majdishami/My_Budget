import { Express } from "express";

export function setupAuth(app: Express): void {
  console.log('[Auth] Setting up minimal auth configuration...');

  // Add a basic endpoint for checking auth status
  app.get("/api/user", (req, res) => {
    // Since no auth is needed, always return a default user
    res.json({ id: 1, username: "default" });
  });

  // Add a logout endpoint
  app.get("/api/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  });

  console.log('[Auth] Minimal auth configuration completed');
}