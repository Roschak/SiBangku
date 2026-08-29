// PRD §166: API Error Model

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
