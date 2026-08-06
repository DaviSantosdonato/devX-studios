import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'bolt';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  accent: {
    50: '#EEF9FF',
    100: '#D8F1FF',
    200: '#BAE7FF',
    300: '#8ADAFF',
    400: '#53C4FF',
    500: '#2BA6FF',
    600: '#1488FC',
    700: '#0D6FE8',
    800: '#1259BB',
    900: '#154E93',
    950: '#122F59',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  shortcuts: {
    'bolt-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 bolt-ease-cubic-bezier',
    kdb: 'bg-bolt-elements-code-background text-bolt-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      bolt: {
        elements: {
          borderColor: 'var(--bolt-elements-borderColor)',
          borderColorActive: 'var(--bolt-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--bolt-elements-bg-depth-1)',
              2: 'var(--bolt-elements-bg-depth-2)',
              3: 'var(--bolt-elements-bg-depth-3)',
              4: 'var(--bolt-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--bolt-elements-textPrimary)',
          textSecondary: 'var(--bolt-elements-textSecondary)',
          textTertiary: 'var(--bolt-elements-textTertiary)',
          code: {
            background: 'var(--bolt-elements-code-background)',
            text: 'var(--bolt-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--bolt-elements-button-primary-background)',
              backgroundHover: 'var(--bolt-elements-button-primary-backgroundHover)',
              text: 'var(--bolt-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--bolt-elements-button-secondary-background)',
              backgroundHover: 'var(--bolt-elements-button-secondary-backgroundHover)',
              text: 'var(--bolt-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--bolt-elements-button-danger-background)',
              backgroundHover: 'var(--bolt-elements-button-danger-backgroundHover)',
              text: 'var(--bolt-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--bolt-elements-item-contentDefault)',
            contentActive: 'var(--bolt-elements-item-contentActive)',
            contentAccent: 'var(--bolt-elements-item-contentAccent)',
            contentDanger: 'var(--bolt-elements-item-contentDanger)',
            backgroundDefault: 'var(--bolt-elements-item-backgroundDefault)',
            backgroundActive: 'var(--bolt-elements-item-backgroundActive)',
            backgroundAccent: 'var(--bolt-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--bolt-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--bolt-elements-actions-background)',
            code: {
              background: 'var(--bolt-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--bolt-elements-artifacts-background)',
            backgroundHover: 'var(--bolt-elements-artifacts-backgroundHover)',
            borderColor: 'var(--bolt-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--bolt-elements-artifacts-inlineCode-background)',
              text: 'var(--bolt-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--bolt-elements-messages-background)',
            linkColor: 'var(--bolt-elements-messages-linkColor)',
            code: {
              background: 'var(--bolt-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--bolt-elements-messages-inlineCode-background)',
              text: 'var(--bolt-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--bolt-elements-icon-success)',
            error: 'var(--bolt-elements-icon-error)',
            primary: 'var(--bolt-elements-icon-primary)',
            secondary: 'var(--bolt-elements-icon-secondary)',
            tertiary: 'var(--bolt-elements-icon-tertiary)',
          },
          preview: {
            addressBar: {
              background: 'var(--bolt-elements-preview-addressBar-background)',
              backgroundHover: 'var(--bolt-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--bolt-elements-preview-addressBar-backgroundActive)',
              text: 'var(--bolt-elements-preview-addressBar-text)',
              textActive: 'var(--bolt-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--bolt-elements-terminals-background)',
            buttonBackground: 'var(--bolt-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--bolt-elements-dividerColor)',
          loader: {
            background: 'var(--bolt-elements-loader-background)',
            progress: 'var(--bolt-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--bolt-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--bolt-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--bolt-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--bolt-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--bolt-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--bolt-elements-cta-background)',
            text: 'var(--bolt-elements-cta-text)',
          },
        },
      },
    },
    devx: {
      elements: {
        borderColor: 'var(--devx-elements-borderColor)',
        borderColorActive: 'var(--devx-elements-borderColorActive)',
        background: {
          depth: {
            1: 'var(--devx-elements-bg-depth-1)',
            2: 'var(--devx-elements-bg-depth-2)',
            3: 'var(--devx-elements-bg-depth-3)',
            4: 'var(--devx-elements-bg-depth-4)',
          },
        },
        textPrimary: 'var(--devx-elements-textPrimary)',
        textSecondary: 'var(--devx-elements-textSecondary)',
        textTertiary: 'var(--devx-elements-textTertiary)',
        code: {
          background: 'var(--devx-elements-code-background)',
          text: 'var(--devx-elements-code-text)',
        },
        button: {
          primary: {
            background: 'var(--devx-elements-button-primary-background)',
            backgroundHover: 'var(--devx-elements-button-primary-backgroundHover)',
            text: 'var(--devx-elements-button-primary-text)',
          },
          secondary: {
            background: 'var(--devx-elements-button-secondary-background)',
            backgroundHover: 'var(--devx-elements-button-secondary-backgroundHover)',
            text: 'var(--devx-elements-button-secondary-text)',
          },
          danger: {
            background: 'var(--devx-elements-button-danger-background)',
            backgroundHover: 'var(--devx-elements-button-danger-backgroundHover)',
            text: 'var(--devx-elements-button-danger-text)',
          },
        },
        item: {
          contentDefault: 'var(--devx-elements-item-contentDefault)',
          contentActive: 'var(--devx-elements-item-contentActive)',
          contentAccent: 'var(--devx-elements-item-contentAccent)',
          contentDanger: 'var(--devx-elements-item-contentDanger)',
          backgroundDefault: 'var(--devx-elements-item-backgroundDefault)',
          backgroundActive: 'var(--devx-elements-item-backgroundActive)',
          backgroundAccent: 'var(--devx-elements-item-backgroundAccent)',
          backgroundDanger: 'var(--devx-elements-item-backgroundDanger)',
        },
        actions: {
          background: 'var(--devx-elements-actions-background)',
          code: {
            background: 'var(--devx-elements-actions-code-background)',
          },
        },
        artifacts: {
          background: 'var(--devx-elements-artifacts-background)',
          backgroundHover: 'var(--devx-elements-artifacts-backgroundHover)',
          borderColor: 'var(--devx-elements-artifacts-borderColor)',
          inlineCode: {
            background: 'var(--devx-elements-artifacts-inlineCode-background)',
            text: 'var(--devx-elements-artifacts-inlineCode-text)',
          },
        },
        messages: {
          background: 'var(--devx-elements-messages-background)',
          linkColor: 'var(--devx-elements-messages-linkColor)',
          code: {
            background: 'var(--devx-elements-messages-code-background)',
          },
          inlineCode: {
            background: 'var(--devx-elements-messages-inlineCode-background)',
            text: 'var(--devx-elements-messages-inlineCode-text)',
          },
        },
        icon: {
          success: 'var(--devx-elements-icon-success)',
          error: 'var(--devx-elements-icon-error)',
          primary: 'var(--devx-elements-icon-primary)',
          secondary: 'var(--devx-elements-icon-secondary)',
          tertiary: 'var(--devx-elements-icon-tertiary)',
        },
        preview: {
          addressBar: {
            background: 'var(--devx-elements-preview-addressBar-background)',
            backgroundHover: 'var(--devx-elements-preview-addressBar-backgroundHover)',
            backgroundActive: 'var(--devx-elements-preview-addressBar-backgroundActive)',
            text: 'var(--devx-elements-preview-addressBar-text)',
            textActive: 'var(--devx-elements-preview-addressBar-textActive)',
          },
        },
        terminals: {
          background: 'var(--devx-elements-terminals-background)',
          buttonBackground: 'var(--devx-elements-terminals-buttonBackground)',
        },
        dividerColor: 'var(--devx-elements-dividerColor)',
        loader: {
          background: 'var(--devx-elements-loader-background)',
          progress: 'var(--devx-elements-loader-progress)',
        },
        prompt: {
          background: 'var(--devx-elements-prompt-background)',
        },
        sidebar: {
          dropdownShadow: 'var(--devx-elements-sidebar-dropdownShadow)',
          buttonBackgroundDefault: 'var(--devx-elements-sidebar-buttonBackgroundDefault)',
          buttonBackgroundHover: 'var(--devx-elements-sidebar-buttonBackgroundHover)',
          buttonText: 'var(--devx-elements-sidebar-buttonText)',
        },
        cta: {
          background: 'var(--devx-elements-cta-background)',
          text: 'var(--devx-elements-cta-text)',
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
    }),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
