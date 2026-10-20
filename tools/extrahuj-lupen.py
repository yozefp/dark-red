"""
Vytiahne obrys lupeňa priamo zo schválenej obrazovky.

Tvar sa nedal rozumne popísať vzorcom — je asymetrický a ostrý len pri
stopke. Tento skript izoluje rozsvietený lupeň podľa farby, doplní časť
zakrytú susedným lupeňom konvexným obalom, zahladí obvod a znormalizuje
tak, že stopka leží v počiatku a špica v [1, 0]. Výstup sa vkladá ako
konštanta LEAF do src/games/memorize/geometry.ts.

    python3 tools/extrahuj-lupen.py ../ref-obrazovky/05-memorize-lupene.png

Vyžaduje pillow, numpy, scipy a scikit-image.
"""
import sys
import numpy as np
from PIL import Image
from skimage import measure
from scipy import ndimage
from scipy.spatial import ConvexHull

src = sys.argv[1] if len(sys.argv) > 1 else '../ref-obrazovky/05-memorize-lupene.png'
a = np.asarray(Image.open(src).convert('RGB')).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

mask = (r > 190) & (g > 60) & (g < 170) & (b < 90)
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))
mask = lab == (np.argmax(sizes) + 1)          # najväčšia súvislá plocha

contour = max(measure.find_contours(mask.astype(float), 0.5), key=len)
pts = np.stack([contour[:, 1], contour[:, 0]], 1)
hull = pts[ConvexHull(pts).vertices]

def resample(poly, n):
    closed = np.r_[poly, poly[:1]]
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(closed, axis=0), axis=1))]
    u = np.linspace(0, d[-1], n, endpoint=False)
    return np.stack([np.interp(u, d, closed[:, k]) for k in (0, 1)], 1)

hull = resample(hull, 220)

def sharpness(p, i, k=18):
    u = p[(i - k) % len(p)] - p[i]
    v = p[(i + k) % len(p)] - p[i]
    return (u / (np.linalg.norm(u) + 1e-9)) @ (v / (np.linalg.norm(v) + 1e-9))

base_i = int(np.argmax([sharpness(hull, i) for i in range(len(hull))]))
base = hull[base_i]
tip = hull[int(np.argmax(((hull - base) ** 2).sum(1)))]

axis = tip - base
L = np.linalg.norm(axis)
axis = axis / L
perp = np.array([-axis[1], axis[0]])
loc = np.stack([(hull - base) @ axis / L, (hull - base) @ perp / L], 1)
loc = np.roll(loc, -base_i, axis=0)
if loc[:, 1].sum() < 0:
    loc[:, 1] *= -1

def smooth(p, k=9):
    out = np.empty_like(p)
    for i in range(len(p)):
        out[i] = p[[(i + j) % len(p) for j in range(-(k // 2), k // 2 + 1)]].mean(0)
    return out

for _ in range(3):                             # stopku drž ostrú
    w = np.clip(np.linalg.norm(loc, axis=1) / 0.14, 0, 1)[:, None]
    loc = loc * (1 - w) + smooth(loc) * w

loc = resample(loc, 56)
loc = np.roll(loc, -int(np.argmin((loc ** 2).sum(1))), axis=0)
loc[0] = [0.0, 0.0]

for i in range(0, len(loc), 4):
    print('  ' + ', '.join(f'[{x:.3f},{y:.3f}]' for x, y in loc[i:i + 4]) + ',')
