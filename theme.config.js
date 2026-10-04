/** @type {const} */
const darkPalette = {
  primary: "#36D4C7",
  background: "#05080A",
  surface: "#10161A",
  foreground: "#FFFFFF",
  muted: "#FFFFFF",
  border: "#334047",
  success: "#5BD3A8",
  warning: "#FFC15C",
  error: "#FF8585",
};

const themeColors = {
  primary: { light: darkPalette.primary, dark: darkPalette.primary },
  background: { light: darkPalette.background, dark: darkPalette.background },
  surface: { light: darkPalette.surface, dark: darkPalette.surface },
  foreground: { light: darkPalette.foreground, dark: darkPalette.foreground },
  muted: { light: darkPalette.muted, dark: darkPalette.muted },
  border: { light: darkPalette.border, dark: darkPalette.border },
  success: { light: darkPalette.success, dark: darkPalette.success },
  warning: { light: darkPalette.warning, dark: darkPalette.warning },
  error: { light: darkPalette.error, dark: darkPalette.error },
};

module.exports = { themeColors };
