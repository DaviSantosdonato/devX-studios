import { useStore } from '@nanostores/react';
import { description } from './useChatHistory';

interface ChatDescriptionProps {
  fallback?: string;
}

export function ChatDescription({ fallback = 'Untitled project' }: ChatDescriptionProps) {
  return useStore(description) ?? fallback;
}
