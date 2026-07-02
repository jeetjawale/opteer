"use client";
import { useState } from 'react';

interface CompanyLogoProps {
  company: string;
  logoUrl?: string | null;
  jobUrl?: string | null;
  fallback: React.ReactNode;
}

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Get the root domain: last two parts (e.g. target.com from corporate.target.com)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return null;
  }
}

export function CompanyLogo({ company, logoUrl, jobUrl, fallback }: CompanyLogoProps) {
  const [error, setError] = useState(false);

  if (error) {
    return <>{fallback}</>;
  }

  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

  let src = logoUrl || null;

  if (!src && logoDevToken) {
    // Prefer extracting domain from the actual job URL (accurate)
    const domain = jobUrl ? extractDomain(jobUrl) : null;
    if (domain) {
      src = `https://img.logo.dev/${domain}?token=${logoDevToken}&size=64&format=png`;
    } else if (company) {
      // Last resort: search by name via logo.dev name endpoint
      src = `https://img.logo.dev/${encodeURIComponent(company)}?token=${logoDevToken}&size=64&format=png`;
    }
  }

  if (!src) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={`${company} logo`}
      className="w-full h-full object-contain"
      style={{ padding: '4px', borderRadius: 'inherit' }}
      onError={() => setError(true)}
    />
  );
}
