import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--devx-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--devx-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--devx-elements-terminal-textColor'),
    background: cssVar('--devx-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--devx-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--devx-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--devx-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--devx-elements-terminal-color-black'),
    red: cssVar('--devx-elements-terminal-color-red'),
    green: cssVar('--devx-elements-terminal-color-green'),
    yellow: cssVar('--devx-elements-terminal-color-yellow'),
    blue: cssVar('--devx-elements-terminal-color-blue'),
    magenta: cssVar('--devx-elements-terminal-color-magenta'),
    cyan: cssVar('--devx-elements-terminal-color-cyan'),
    white: cssVar('--devx-elements-terminal-color-white'),
    brightBlack: cssVar('--devx-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--devx-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--devx-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--devx-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--devx-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--devx-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--devx-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--devx-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
