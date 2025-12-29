import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Basic Meta */}
        <meta name="description" content="Professional junk removal services in Las Vegas. Fast, reliable, and affordable. We haul furniture, appliances, yard waste, and more. Family-owned business serving the Las Vegas Valley." />
        <meta name="keywords" content="junk removal Las Vegas, junk hauling, furniture removal, appliance removal, yard waste removal, trash removal Las Vegas, debris removal, cleanout services Las Vegas" />

        {/* Open Graph */}
        <meta property="og:title" content="Felix Cleans It LLC - Professional Junk Removal Las Vegas" />
        <meta property="og:description" content="Fast & reliable junk removal in Las Vegas. Family-owned business. We haul it all - no job too big or small. Free quotes!" />
        <meta property="og:image" content="https://felixcleansit.com/og-image.jpg" />
        <meta property="og:url" content="https://felixcleansit.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Felix Cleans It LLC - Junk Removal Las Vegas" />
        <meta name="twitter:description" content="Professional junk removal in Las Vegas. We haul it all! Family-owned, fast service, free quotes." />
        <meta name="twitter:image" content="https://felixcleansit.com/og-image.jpg" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* Additional SEO */}
        <meta name="author" content="Felix Cleans It LLC" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Local Business Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Felix Cleans It LLC",
              "description": "Professional junk removal and hauling services in Las Vegas",
              "telephone": "(702) 583-1039",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Las Vegas",
                "addressRegion": "NV",
                "addressCountry": "US"
              },
              "areaServed": [
                "Las Vegas",
                "Summerlin",
                "Enterprise",
                "Henderson",
                "Clark County"
              ],
              "priceRange": "$$",
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Saturday", "Sunday"],
                  "opens": "08:00",
                  "closes": "18:00"
                },
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                  "opens": "16:00",
                  "closes": "20:00"
                }
              ],
              "url": "https://felixcleansit.com",
              "image": "https://felixcleansit.com/og-image.jpg"
            })
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}