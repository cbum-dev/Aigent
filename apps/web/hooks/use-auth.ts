"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type User, type TokenResponse } from "@/lib/api";

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        password: string;
        full_name: string;
        company_name: string;
    }) => Promise<void>;
    logout: () => void;
    refreshTokens: () => Promise<void>;
    fetchUser: () => Promise<void>;
    setTokens: (tokens: TokenResponse) => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            isAuthenticated: false,

            setTokens: (tokens: TokenResponse) => {
                set({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isAuthenticated: true,
                });
            },

            login: async (email: string, password: string) => {
                set({ isLoading: true });
                try {
                    const tokens = await api.login(email, password);
                    set({
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        isAuthenticated: true,
                    });

                    // Fetch user info
                    const user = await api.getCurrentUser(tokens.access_token);
                    set({ user, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            register: async (data) => {
                set({ isLoading: true });
                try {
                    const tokens = await api.register(data);
                    set({
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        isAuthenticated: true,
                    });

                    // Fetch user info
                    const user = await api.getCurrentUser(tokens.access_token);
                    set({ user, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            refreshTokens: async () => {
                const { refreshToken } = get();
                if (!refreshToken) {
                    get().logout();
                    return;
                }

                try {
                    const tokens = await api.refreshToken(refreshToken);
                    set({
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                    });
                } catch {
                    get().logout();
                }
            },

            fetchUser: async () => {
                const { accessToken } = get();
                if (!accessToken) return;

                try {
                    const user = await api.getCurrentUser(accessToken);
                    set({ user });
                } catch {
                    // Token might be expired, try to refresh
                    await get().refreshTokens();
                    const newToken = get().accessToken;
                    if (newToken) {
                        const user = await api.getCurrentUser(newToken);
                        set({ user });
                    }
                }
            },
            _hasHydrated: false,
            setHasHydrated: (state) => {
                set({
                    _hasHydrated: state
                });
            },
        }),
        {
            name: "aigent-auth",
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
