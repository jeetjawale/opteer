"use client";

import React, { useState, useEffect } from "react";

interface CompanyLogoProps {
  company: string;
  url?: string | null;
  initials: string;
  avatarBg: string;
  className?: string;
}

const getRootDomain = (hostname: string) => {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  
  const secondLevel = parts[parts.length - 2];
  if (["co", "com", "org", "net", "edu", "gov", "ac"].includes(secondLevel)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
};

export default function CompanyLogo({ company, url, initials, avatarBg, className = "" }: CompanyLogoProps) {
  const [error, setError] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let domain = "";
    if (url) {
      try {
        const urlObj = new URL(url);
        domain = getRootDomain(urlObj.hostname.replace("www.", ""));
      } catch (e) {
        // invalid URL
      }
    }
    
    // If no valid URL, fallback to guessing domain from company name
    if (!domain && company && company !== "Unknown Company") {
      domain = company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
    }
    
    if (domain) {
      setLogoUrl(`https://logo.clearbit.com/${domain}`);
    } else {
      setError(true);
    }
  }, [company, url]);

  if (error || !logoUrl) {
    return (
      <div className={`flex items-center justify-center text-white font-bold ${avatarBg} ${className}`}>
        {initials}
      </div>
    );
  }

  return (
    <img 
      src={logoUrl} 
      alt={`${company} logo`}
      className={`object-contain bg-white ${className}`}
      onError={() => setError(true)}
    />
  );
}
