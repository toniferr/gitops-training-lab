// Applies the saved theme (dark by default) before first paint to avoid a flash. Loaded as a
// blocking script (not inline) so the Content-Security-Policy can forbid inline scripts.
try {
  document.documentElement.dataset.theme = localStorage.getItem('gtl:theme') || 'dark';
} catch (e) {
  document.documentElement.dataset.theme = 'dark';
}
