const sharedConfig = require('@peer/shared/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: ['./src/**/*.{html,js,svelte,ts}']
};
