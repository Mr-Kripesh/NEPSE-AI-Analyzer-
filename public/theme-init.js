try {
  var t = localStorage.getItem('nepsai_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
} catch(e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
