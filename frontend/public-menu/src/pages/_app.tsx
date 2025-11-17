import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { appWithTranslation } from 'next-i18next';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="bottom-center" />
    </>
  );
}

export default appWithTranslation(App);
