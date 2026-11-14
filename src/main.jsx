import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import App from './App';
import './styles.css';

const FACES = ['200 340px Inter', '300 200px Inter', '400 46px Inter', '500 46px Inter', '600 46px Inter'];

async function start() {
  try {
    await Promise.all(FACES.map((f) => document.fonts.load(f, '0 한글 ABC')));
    await document.fonts.ready;
  } catch (e) {
    /* fall through: system fonts are used */
  }
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

start();
