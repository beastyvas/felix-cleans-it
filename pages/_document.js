import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Basic Meta */}
        <meta name="description" content="Professional mobile auto repair services in Las Vegas. We come to you! Oil changes, brakes, diagnostics, and more. Serving Clark County." />
        <meta name="keywords" content="mobile mechanic, auto repair Las Vegas, mobile auto repair, car repair, mechanic Las Vegas, oil change, brake repair" />

        {/* Open Graph */}
        <meta property="og:title" content="Isma's OnSite Auto Repair - Mobile Mechanic Las Vegas" />
        <meta property="og:description" content="Professional mobile auto repair that comes to you. Serving Clark County and surrounding areas. Book your appointment today!" />
        <meta property="og:image" content="https://www.onsiteautolv/og-image.png" />
        <meta property="og:url" content="https://www.onsiteautolv.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Isma's OnSite Auto Repair - Mobile Mechanic" />
        <meta name="twitter:description" content="Professional mobile auto repair in Las Vegas. We come to you!" />
        <meta name="twitter:image" content="https://www.onsiteautolv/og-image.png" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}