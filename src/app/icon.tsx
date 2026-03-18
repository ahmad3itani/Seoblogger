import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 32,
  height: 32,
}
 
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '6px',
          fontWeight: 'bold',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'relative' }}>
          B
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-8px',
              width: '8px',
              height: '8px',
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
