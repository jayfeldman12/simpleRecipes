import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import Head from "next/head";
import DndProvider from "../src/components/DndProvider";
import Navbar from "../src/components/Navbar";
import "../src/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <DndProvider>
        <Head>
          <title>Simple Recipes</title>
          <meta
            name="description"
            content="A simple recipe sharing application"
          />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-6">
            <Component {...pageProps} />
          </main>
          <footer className="bg-gray-800 text-white py-6">
            <div className="container mx-auto px-4 text-center">
              <p>
                © {new Date().getFullYear()} Simple Recipes. All rights
                reserved.
              </p>
            </div>
          </footer>
        </div>
      </DndProvider>
    </SessionProvider>
  );
}
