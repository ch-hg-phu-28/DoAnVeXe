const REQUIRED = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'PAYMENT_SECRET', 'CHATBOT_TOOL_KEY'] as const;

/** Dừng server ngay khi khởi động nếu thiếu biến môi trường bắt buộc. */
export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}. Sao chép .env.example thành .env rồi điền giá trị.`);
  }
  return config;
}
