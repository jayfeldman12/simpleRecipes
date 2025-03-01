import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html style={{ backgroundColor: "#f8f9fa" }}>
        <Head />
        <body style={{ backgroundColor: "#f8f9fa", margin: 0, padding: 0 }}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
