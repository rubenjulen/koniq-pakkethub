// Zet de .dark-class vóór de eerste paint (geen flits), op basis van cookie 'theme'
// (light | dark | system). Default = system (volgt het OS).
const THEME_INIT = `(function(){try{
  var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);
  var t=m?decodeURIComponent(m[1]):'system';
  var dark = t==='dark' || (t!=='light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
