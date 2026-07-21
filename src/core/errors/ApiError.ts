import { AppError } from "./AppError";

export class ApiError extends AppError {
  public readonly status?: number;
  public readonly userMessage?: string;

  constructor(
    message: string,
    status?: number,
    details?: unknown,
    userMessage?: string
  ) {
    super(message, "API_ERROR", details);
    this.name = "ApiError";
    this.status = status;
    this.userMessage = userMessage ?? message;
  }
}
