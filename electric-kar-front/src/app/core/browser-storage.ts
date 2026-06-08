import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Returns true when the current platform is the browser. Must be called inside an injection context. */
export function injectIsBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

/** Safe localStorage.getItem: returns null instead of throwing on the server or in restricted environments. */
export function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Safe localStorage.setItem: swallows errors on the server or in restricted environments. */
export function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* server-side or storage blocked — silently ignore */
  }
}
