const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        if (token) {
            (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new ApiError(
                error.detail || response.statusText,
                response.status,
                error
            );
        }

        // Handle no content responses
        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    // Auth endpoints
    async login(email: string, password: string) {
        return this.request<TokenResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
    }

    async register(data: RegisterData) {
        return this.request<TokenResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async refreshToken(refreshToken: string) {
        return this.request<TokenResponse>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
    }

    // User endpoints
    async getCurrentUser(token: string) {
        return this.request<User>("/users/me", { token });
    }

    async updateProfile(token: string, data: Partial<User>) {
        return this.request<User>("/users/me", {
            method: "PATCH",
            token,
            body: JSON.stringify(data),
        });
    }

    // Company endpoints
    async getCompany(token: string) {
        return this.request<Company>("/companies/me", { token });
    }

    // Connections endpoints
    async listConnections(token: string) {
        return this.request<DatabaseConnection[]>("/connections", { token });
    }

    async createConnection(token: string, data: CreateConnectionData) {
        return this.request<DatabaseConnection>("/connections", {
            method: "POST",
            token,
            body: JSON.stringify(data),
        });
    }

    async testConnection(token: string, data: TestConnectionData) {
        return this.request<TestConnectionResponse>("/connections/test", {
            method: "POST",
            token,
            body: JSON.stringify(data),
        });
    }

    async testSavedConnection(token: string, connectionId: string) {
        return this.request<TestConnectionResponse>(
            `/connections/${connectionId}/test`,
            { method: "POST", token }
        );
    }

    async getConnectionSchema(token: string, connectionId: string) {
        return this.request<SchemaInfo>(`/connections/${connectionId}/schema`, {
            token,
        });
    }

    async deleteConnection(token: string, connectionId: string) {
        return this.request<void>(`/connections/${connectionId}`, {
            method: "DELETE",
            token,
        });
    }

    // Conversations endpoints
    async listConversations(token: string, page = 1, perPage = 20) {
        return this.request<ConversationList>(
            `/conversations?page=${page}&per_page=${perPage}`,
            { token }
        );
    }

    async createConversation(token: string, data: { title?: string; database_connection_id?: string }) {
        return this.request<Conversation>("/conversations/", {
            method: "POST",
            token,
            body: JSON.stringify(data),
        });
    }

    async getMessages(token: string, conversationId: string) {
        return this.request<Message[]>(`/conversations/${conversationId}/messages`, { token });
    }

    getWsUrl(token: string, conversationId: string): string {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = process.env.NEXT_PUBLIC_API_URL
            ? new URL(process.env.NEXT_PUBLIC_API_URL).host
            : "localhost:8000";
        return `${protocol}//${host}/chat/${conversationId}?token=${token}`;
    }

    async getConversation(token: string, conversationId: string) {
        return this.request<ConversationWithMessages>(
            `/conversations/${conversationId}`,
            { token }
        );
    }

    async deleteConversation(token: string, conversationId: string) {
        return this.request<void>(`/conversations/${conversationId}`, {
            method: "DELETE",
            token,
        });
    }

    async sendMessage(token: string, conversationId: string, content: string) {
        return this.request<Message>(`/conversations/${conversationId}/messages`, {
            method: "POST",
            token,
            body: JSON.stringify({ content }),
        });
    }

    // Reports endpoints
    async listReports(token: string) {
        return this.request<ReportListResponse>("/reports", { token });
    }

    async createReport(token: string, data: CreateReportData) {
        return this.request<Report>("/reports", {
            method: "POST",
            token,
            body: JSON.stringify(data),
        });
    }

    async getReport(token: string, reportId: string) {
        return this.request<Report>(`/reports/${reportId}`, { token });
    }

    async deleteReport(token: string, reportId: string) {
        return this.request<void>(`/reports/${reportId}`, {
            method: "DELETE",
            token,
        });
    }
}

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

// Types
export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
}

export interface User {
    id: string;
    company_id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    company_name?: string;
    company_slug?: string;
}

export interface Company {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    user_count: number;
    connection_count: number;
    conversation_count: number;
}

export interface DatabaseConnection {
    id: string;
    company_id: string;
    name: string;
    description?: string;
    host: string;
    port: number;
    database: string;
    ssl_mode: string;
    is_active: boolean;
    last_tested_at?: string;
    last_test_success?: boolean;
    created_at: string;
}

export interface CreateConnectionData {
    name: string;
    description?: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl_mode?: string;
}

export interface TestConnectionData {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl_mode?: string;
}

export interface TestConnectionResponse {
    success: boolean;
    message?: string;
}

export interface SchemaInfo {
    tables: TableInfo[];
}

export interface TableInfo {
    name: string;
    schema: string;
    full_name: string;
    columns: ColumnInfo[];
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
}

export interface Conversation {
    id: string;
    company_id: string;
    user_id: string;
    title: string;
    database_connection_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    conversation_id: string;
    message_metadata?: Record<string, any>;
    sql_query?: string | null;
    data?: any[] | null;
}

export interface Report {
    id: string;
    conversation_id: string;
    title: string;
    description: string | null;
    sql_query: string | null;
    results: Record<string, any> | null;
    chart_type: string | null;
    chart_config: Record<string, any> | null;
    insights: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReportListResponse {
    items: Report[];
    total: number;
}

export interface CreateReportData {
    conversation_id: string;
    title: string;
    description?: string;
    sql_query?: string;
    results?: Record<string, any>;
    chart_type?: string;
    chart_config?: Record<string, any>;
    insights?: string;
}

export type AgentMessage = {
    agent: string;
    type: string;
    content: string;
    msg_type?: string;
};

export interface ConversationWithMessages extends Conversation {
    messages: Message[];
}

export interface ConversationList {
    items: Conversation[];
    total: number;
    page: number;
    per_page: number;
}

export interface CreateConversationData {
    title?: string;
    database_connection_id?: string;
}

// Export singleton instance
export const api = new ApiClient(API_URL);
