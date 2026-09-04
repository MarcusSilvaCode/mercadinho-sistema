import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export interface ApiErrorBody {
  error: string;
  issues?: { path: string; message: string }[];
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error) return body.error;
  }
  return "Não foi possível completar a operação. Tente novamente.";
}
