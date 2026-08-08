interface Env {
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  NVIDIA_API_KEY: string;
  [key: string]: string | undefined;
}
