import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html style={{ backgroundColor: "#f8f9fa" }}>
        <Head>
          {/* Most reliable favicon format */}
          <link rel="icon" href="/favicon.ico" />
          
          {/* Fallback for modern browsers */}
          <link rel="icon" type="image/png" href="/icon.png" />
          
          {/* For iOS devices */}
          <link rel="apple-touch-icon" href="/icon.png" />
        </Head>
        <body style={{ backgroundColor: "#f8f9fa", margin: 0, padding: 0 }}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
