import { createContext, useContext } from "react";

// Simple auth context with default user
const AuthContext = createContext({
  user: { id: 1, username: "default" },
  isLoading: false,
  error: null,
  loginMutation: { mutate: () => {}, isPending: false },
  logoutMutation: { mutate: () => {}, isPending: false },
  registerMutation: { mutate: () => {}, isPending: false }
});

export function AuthProvider({ children }) {
  // Simple provider that gives access to a default user
  return (
    <AuthContext.Provider
      value={{
        user: { id: 1, username: "default" },
        isLoading: false,
        error: null,
        loginMutation: { mutate: () => {}, isPending: false },
        logoutMutation: { mutate: () => {}, isPending: false },
        registerMutation: { mutate: () => {}, isPending: false }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}