import { PUBLIC_ORIGIN } from './public-origin.js';

export const publicUrl = (pathname) => new URL(pathname, PUBLIC_ORIGIN).href;
