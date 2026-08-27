import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  structuredData?: Record<string, any> | Array<Record<string, any>>;
}

export function SEOHead({
  title,
  description = "ADWA ARENA — Register teams, follow real-time brackets, and broadcast live matches.",
  keywords,
  canonicalUrl,
  ogImage = "https://adwaarena.com/placeholder.svg",
  ogType = "website",
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    const defaultTitle = "ADWA ARENA — Competitive Esports Tournament Platform";
    const fullTitle = title ? ${title} | ADWA ARENA : defaultTitle;
    document.title = fullTitle;

    // Helper to set or create meta tags
    const setMetaTag = (selector: string, attr: string, key: string, value: string) => {
      let element = document.querySelector(meta[=""]);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", value);
    };

    // Standard Meta
    setMetaTag('meta[name="description"]', "name", "description", description);
    if (keywords) {
      setMetaTag('meta[name="keywords"]', "name", "keywords", keywords);
    }

    // OpenGraph
    setMetaTag('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    setMetaTag('meta[property="og:image"]', "property", "og:image", ogImage);
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    if (canonicalUrl) {
      setMetaTag('meta[property="og:url"]', "property", "og:url", canonicalUrl);
      
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonicalUrl);
    }

    // Twitter
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", ogImage);

    // Dynamic JSON-LD Structured Data
    const scriptId = "seo-structured-data";
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (structuredData) {
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = scriptId;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = JSON.stringify(structuredData);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Optional cleanup on unmount
      const existingScript = document.getElementById(scriptId);
      if (existingScript) existingScript.remove();
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, structuredData]);

  return null;
}
