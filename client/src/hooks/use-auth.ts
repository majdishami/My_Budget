import { useLocation } from "wouter";

export function useAuth() {
  return {
    user: { id: 1, username: "default" }, // Return a default user
    isLoading: false,
    loginMutation: {
      mutate: () => {},
      isPending: false
    },
    registerMutation: {
      mutate: () => {},
      isPending: false
    }
  };
}
