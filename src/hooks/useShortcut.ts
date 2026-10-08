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

/** Enter and Space press the focused button or checkbox, not a shortcut */
const pressesControl = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  return (event.key === 'Enter' || event.key === ' ')
    && !!target && ['BUTTON', 'A', 'INPUT'].includes(target.tagName);
};

/** A dialog that waits for an answer takes the keys */
const dialogOpen = () => !!document.querySelector('[aria-modal="true"]');

/**
 * Run handler when the key of a shortcut is pressed (see utils/shortcuts.ts)
 *
 * The handler gets the key event, for shortcuts with several keys (the arrows
 * of the brightness, the digits of the classes). Without a name nothing is
 * bound, for controls whose shortcut is optional.
 */
export const useShortcut = (
  name: ShortcutName | undefined,
  handler: (event: KeyboardEvent) => void
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const shortcut = name ? (SHORTCUTS[name] as Shortcut) : undefined;
    if (!shortcut) return;
    const { code, key, keys, alternatives = [], repeat = false } = shortcut;
    const characters = (keys ?? [key, ...alternatives]).map((character) => character.toLowerCase());
    if (!characters.length) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Windows reports AltGr as Ctrl+Alt
      const altGraph = event.getModifierState?.('AltGraph') ?? false;
      if (event.repeat && !repeat) return;
      if (((event.ctrlKey || event.metaKey) && !altGraph) || isTyping(event)) return;
      if (pressesControl(event) || dialogOpen()) return;
      // Match the character typed, so the shortcuts follow the keyboard layout
      // (on a Spanish keyboard + sits where ] is on an English one). Only when
      // Alt changes the character, e.g. Option+P on a Mac, match the key itself.
      const sameCharacter = characters.includes(event.key.toLowerCase());
      const sameKey = !!code && event.altKey && event.code === code;
      if (!sameCharacter && !sameKey) return;
      event.preventDefault();
      handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [name]);
};
