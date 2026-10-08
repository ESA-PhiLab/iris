import { useEffect, useRef } from 'react';
import { SHORTCUTS, Shortcut, ShortcutName } from '../utils/shortcuts';

const TEXT_INPUTS = ['text', 'search', 'password', 'email', 'number', 'url', 'tel'];

/** Whether the user is typing in a field, where keys are text and not shortcuts */
const isTyping = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return true;
  }
  return target.tagName === 'INPUT' && TEXT_INPUTS.includes((target as HTMLInputElement).type);
};

/**
 * Run handler when the key of a shortcut is pressed (see utils/shortcuts.ts)
 *
 * Without a name nothing is bound, for controls whose shortcut is optional.
 */
export const useShortcut = (name: ShortcutName | undefined, handler: () => void) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const shortcut = name ? (SHORTCUTS[name] as Shortcut) : undefined;
    if (!shortcut?.code) return;
    const { code, key, alternatives = [] } = shortcut;
    const characters = [key, ...alternatives].map((character) => character.toLowerCase());

    const onKeyDown = (event: KeyboardEvent) => {
      // Windows reports AltGr as Ctrl+Alt
      const altGraph = event.getModifierState?.('AltGraph') ?? false;
      if (event.repeat || ((event.ctrlKey || event.metaKey) && !altGraph) || isTyping(event)) return;
      // Match the character typed, so the shortcuts follow the keyboard layout
      // (on a Spanish keyboard + sits where ] is on an English one). Only when
      // Alt changes the character, e.g. Option+P on a Mac, match the key itself.
      const sameCharacter = characters.includes(event.key.toLowerCase());
      const sameKey = event.altKey && event.code === code;
      if (!sameCharacter && !sameKey) return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [name]);
};
