import { Compartment, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { Theme } from '~/types/theme.js';
import type { EditorSettings } from './CodeMirrorEditor.js';

export const darkTheme = EditorView.theme({}, { dark: true });
export const themeSelection = new Compartment();

export function getTheme(theme: Theme, settings: EditorSettings = {}): Extension {
  return [
    getEditorTheme(settings),
    theme === 'dark' ? themeSelection.of([getDarkTheme()]) : themeSelection.of([getLightTheme()]),
  ];
}

export function reconfigureTheme(theme: Theme) {
  return themeSelection.reconfigure(theme === 'dark' ? getDarkTheme() : getLightTheme());
}

function getEditorTheme(settings: EditorSettings) {
  return EditorView.theme({
    '&': {
      fontSize: settings.fontSize ?? '12.5px',
      fontFamily: 'var(--devx-font-mono)',
      lineHeight: '1.5',
    },
    '&.cm-editor': {
      height: '100%',
      background: 'var(--devx-elements-editor-backgroundColor)',
      color: 'var(--devx-elements-editor-textColor)',
    },
    '.cm-cursor': {
      borderLeft: 'var(--devx-elements-editor-cursorColor)',
    },
    '.cm-scroller': {
      lineHeight: '1.5',
      '&:focus-visible': {
        outline: 'none',
      },
    },
    '.cm-line': {
      padding: '0 0 0 4px',
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: 'var(--devx-elements-editor-selection-backgroundColor) !important',
      opacity: 'var(--devx-elements-editor-selection-backgroundOpacity, 0.28)',
    },
    '&:not(.cm-focused) > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: 'var(--devx-elements-editor-selection-inactiveBackgroundColor)',
      opacity: 'var(--devx-elements-editor-selection-inactiveBackgroundOpacity, 0.14)',
    },
    '&.cm-focused > .cm-scroller .cm-matchingBracket': {
      backgroundColor: 'var(--devx-elements-editor-matchingBracketBackgroundColor)',
    },
    '.cm-activeLine': {
      background: 'var(--devx-elements-editor-activeLineBackgroundColor)',
    },
    '.cm-gutters': {
      background: 'var(--devx-elements-editor-gutter-backgroundColor)',
      borderRight: '1px solid var(--devx-elements-editor-panels-borderColor)',
      color: 'var(--devx-elements-editor-gutter-textColor)',
    },
    '.cm-gutter': {
      '&.cm-lineNumbers': {
        fontFamily: 'var(--devx-font-mono)',
        fontSize: settings.gutterFontSize ?? settings.fontSize ?? '12.5px',
        minWidth: '3.5rem',
        paddingRight: '8px',
      },
      '& .cm-activeLineGutter': {
        background: 'transparent',
        color: 'var(--devx-elements-editor-gutter-activeLineTextColor)',
      },
      '&.cm-foldGutter .cm-gutterElement > .fold-icon': {
        cursor: 'pointer',
        color: 'var(--devx-elements-editor-foldGutter-textColor)',
        transform: 'translateY(1px)',
        '&:hover': {
          color: 'var(--devx-elements-editor-foldGutter-textColorHover)',
        },
      },
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
    },
    '.cm-tooltip-autocomplete > ul > li': {
      minHeight: '20px',
      padding: '2px 8px',
      fontSize: '12.5px',
    },
    '.cm-panel.cm-search label': {
      marginLeft: '2px',
      fontSize: '12.5px',
    },
    '.cm-panel.cm-search .cm-button': {
      fontSize: '12.5px',
    },
    '.cm-panel.cm-search .cm-textfield': {
      fontSize: '12.5px',
    },
    '.cm-panel.cm-search input[type=checkbox]': {
      position: 'relative',
      transform: 'translateY(2px)',
      marginRight: '4px',
    },
    '.cm-panels': {
      borderColor: 'var(--devx-elements-editor-panels-borderColor)',
    },
    '.cm-panels-bottom': {
      borderTop: '1px solid var(--devx-elements-editor-panels-borderColor)',
      backgroundColor: 'transparent',
    },
    '.cm-panel.cm-search': {
      background: 'var(--devx-elements-editor-search-backgroundColor)',
      color: 'var(--devx-elements-editor-search-textColor)',
      padding: '8px',
    },
    '.cm-search .cm-button': {
      background: 'var(--devx-elements-editor-search-button-backgroundColor)',
      borderColor: 'var(--devx-elements-editor-search-button-borderColor)',
      color: 'var(--devx-elements-editor-search-button-textColor)',
      borderRadius: '4px',
      '&:hover': {
        color: 'var(--devx-elements-editor-search-button-textColorHover)',
      },
      '&:focus-visible': {
        outline: 'none',
        borderColor: 'var(--devx-elements-editor-search-button-borderColorFocused)',
      },
      '&:hover:not(:focus-visible)': {
        background: 'var(--devx-elements-editor-search-button-backgroundColorHover)',
        borderColor: 'var(--devx-elements-editor-search-button-borderColorHover)',
      },
      '&:hover:focus-visible': {
        background: 'var(--devx-elements-editor-search-button-backgroundColorHover)',
        borderColor: 'var(--devx-elements-editor-search-button-borderColorFocused)',
      },
    },
    '.cm-panel.cm-search [name=close]': {
      top: '6px',
      right: '6px',
      padding: '0 6px',
      fontSize: '1rem',
      backgroundColor: 'var(--devx-elements-editor-search-closeButton-backgroundColor)',
      color: 'var(--devx-elements-editor-search-closeButton-textColor)',
      '&:hover': {
        'border-radius': '6px',
        color: 'var(--devx-elements-editor-search-closeButton-textColorHover)',
        backgroundColor: 'var(--devx-elements-editor-search-closeButton-backgroundColorHover)',
      },
    },
    '.cm-search input': {
      background: 'var(--devx-elements-editor-search-input-backgroundColor)',
      borderColor: 'var(--devx-elements-editor-search-input-borderColor)',
      color: 'var(--devx-elements-editor-search-input-textColor)',
      outline: 'none',
      borderRadius: '4px',
      '&:focus-visible': {
        borderColor: 'var(--devx-elements-editor-search-input-borderColorFocused)',
      },
    },
    '.cm-tooltip': {
      background: 'var(--devx-elements-editor-tooltip-backgroundColor)',
      border: '1px solid var(--devx-elements-editor-tooltip-borderColor)',
      color: 'var(--devx-elements-editor-tooltip-textColor)',
      borderRadius: '4px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
      background: 'var(--devx-elements-editor-tooltip-backgroundColorSelected)',
      color: 'var(--devx-elements-editor-tooltip-textColorSelected)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'var(--devx-elements-editor-searchMatch-backgroundColor)',
    },
    '.cm-tooltip.cm-readonly-tooltip': {
      padding: '6px 8px',
      whiteSpace: 'nowrap',
      backgroundColor: 'var(--devx-elements-bg-depth-2)',
      borderColor: 'var(--devx-elements-borderColorActive)',
      borderRadius: '4px',
      '& .cm-tooltip-arrow:before': {
        borderTopColor: 'var(--devx-elements-borderColorActive)',
      },
      '& .cm-tooltip-arrow:after': {
        borderTopColor: 'transparent',
      },
    },
  });
}

function getLightTheme() {
  return vscodeLight;
}

function getDarkTheme() {
  return vscodeDark;
}
