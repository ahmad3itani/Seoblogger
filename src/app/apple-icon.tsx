import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 180,
  height: 180,
}
 
export const contentType = 'image/png'
 
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '40px',
          fontWeight: 'bold',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'relative' }}>
          B
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '-30px',
              width: '30px',
              height: '30px',
              background: '#FFD700',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
