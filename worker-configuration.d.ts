interface Env {
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}
