import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'BloggerSEO - Content Automation for Blogger Platform'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0C0F17 0%, #141825 50%, #1A1F2E 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(108,76,241,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #6C4CF1, #5B3DD6)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            B
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#F1F5F9',
              letterSpacing: '-1px',
            }}
          >
            BloggerSEO
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          AI-Powered Content Automation for Google Blogger
        </div>

        {/* Features row */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '40px',
          }}
        >
          {['SEO Articles', 'Auto-Publish', 'AI Images', 'Bulk Generation'].map((feature) => (
            <div
              key={feature}
              style={{
                padding: '10px 24px',
                background: 'rgba(108,76,241,0.10)',
                border: '1px solid rgba(108,76,241,0.25)',
                borderRadius: '999px',
                fontSize: '18px',
                color: '#8B6CF2',
                fontWeight: '600',
                display: 'flex',
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '18px',
            color: '#64748B',
            display: 'flex',
          }}
        >
          bloggerseowriting.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
