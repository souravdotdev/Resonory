/**
 * A thumbnail that stands in for a photo: a sun over a ridge and a dark
 * foreground, drawn in a 100-wide box `height` tall. The same seed always
 * draws the same picture, so a card keeps its thumbnail between renders.
 */
export type ThumbnailArt = {
  viewBox: string;
  sun: { cx: number; cy: number; r: number };
  ridge: string;
  ground: string;
};

export function thumbnailArt(seed: number, height: number): ThumbnailArt {
  const random = (k: number) => {
    const x = Math.sin(seed * 91.7 + k * 13.3) * 43758.5453;
    return x - Math.floor(x);
  };
  const tenth = (n: number) => Math.round(n * 10) / 10;
  const H = height;
  const peaks = [
    tenth(H * (0.55 + random(4) * 0.2)),
    tenth(25 + random(5) * 15),
    tenth(H * (0.28 + random(6) * 0.2)),
    tenth(55 + random(7) * 10),
    tenth(H * (0.5 + random(8) * 0.2)),
    tenth(75 + random(9) * 10),
    tenth(H * (0.34 + random(10) * 0.2)),
    tenth(H * (0.6 + random(11) * 0.15)),
  ];

  return {
    viewBox: `0 0 100 ${H}`,
    sun: {
      cx: tenth(15 + random(1) * 70),
      cy: tenth(H * (0.16 + random(2) * 0.22)),
      r: tenth(H * (0.09 + random(3) * 0.1)),
    },
    ridge: `M0 ${H} L0 ${peaks[0]} L${peaks[1]} ${peaks[2]} L${peaks[3]} ${peaks[4]} L${peaks[5]} ${peaks[6]} L100 ${peaks[7]} L100 ${H} Z`,
    ground: `M0 ${H} L0 ${tenth(H * 0.8)} Q50 ${tenth(H * (0.62 + random(12) * 0.12))} 100 ${tenth(H * 0.82)} L100 ${H} Z`,
  };
}
