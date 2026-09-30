// Applies the saved theme before first paint to avoid a flash. Loaded as a
// blocking script (not inline) so the Content-Security-Policy can forbid inline scripts.
try {
  const theme = localStorage.getItem('gtl:theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch (e) { /* storage unavailable: keep the system theme */ }
