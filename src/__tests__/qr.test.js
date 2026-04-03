import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

async function encodeAndDecode(url) {
  const pngBuffer = await QRCode.toBuffer(url, { type: 'png' });

  let png;
  try {
    png = PNG.sync.read(pngBuffer);
  } catch {
    // Fallback to async parser if sync read fails
    png = await new Promise((resolve, reject) => {
      new PNG().parse(pngBuffer, (err, data) => (err ? reject(err) : resolve(data)));
    });
  }

  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return result;
}

describe('QR code encode/decode round-trip', () => {
  it('recovers the original URL from an encoded QR buffer', async () => {
    const url = 'http://localhost:5173/Profile?id=test-business-123';
    const result = await encodeAndDecode(url);

    expect(result).not.toBeNull();
    expect(result.data).toBe(url);
  });

  it('recovers a URL with multiple query parameters', async () => {
    const url = 'http://localhost:5173/Profile?id=abc-def&tab=overview';
    const result = await encodeAndDecode(url);

    expect(result).not.toBeNull();
    expect(result.data).toBe(url);
  });
});
