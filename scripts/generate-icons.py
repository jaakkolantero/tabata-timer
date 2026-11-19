"""Generate original, dependency-free PNG app icons (no downloaded artwork)."""
import math
import struct
import zlib
from pathlib import Path


def icon(size, maskable=False):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            # Stopwatch within the central maskable safe zone.
            nx, ny = (x + .5) / size, (y + .5) / size
            radius = math.hypot(nx - .5, ny - .53)
            ring = .225 < radius < .27
            top = .45 < nx < .55 and .19 < ny < .235
            stem = .48 < nx < .52 and .22 < ny < .28
            hand = .48 < nx < .52 and .36 < ny < .54
            hand2 = .5 < nx < .64 and abs((ny - .53) - (nx - .5) * .55) < .019
            color = (201, 244, 119) if ring or top or stem or hand or hand2 else (16, 23, 19)
            row.extend(color)
        rows.append(row)
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')

root = Path(__file__).resolve().parent.parent / 'icons'
root.mkdir(exist_ok=True)
for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
    (root / name).write_bytes(icon(size, name.startswith('maskable')))
    print(name, size)
