export interface FocalPoint {
  x: number;
  y: number;
}

export type PerfumeMedia =
  | {
      type: "sequence";
      basePath: string;
      frameCount: number;
      fps?: number;
      /** 0-based frame shown when this card isn't the active/animating one. */
      posterFrame?: number;
      focalPoint?: FocalPoint;
      mobileFocalPoint?: FocalPoint;
    }
  | {
      type: "image";
      src: string;
      focalPoint?: FocalPoint;
      mobileFocalPoint?: FocalPoint;
    }
  | {
      type: "video";
      src: string;
      /** Static frame shown for lateral/inactive cards and as the ambience source — the video itself never plays there. */
      poster?: string;
      focalPoint?: FocalPoint;
      mobileFocalPoint?: FocalPoint;
    };

function padFrame(index: number): string {
  return String(index).padStart(3, "0");
}

/** The single static image used for a poster (inactive card / ambience background). */
export function getPosterSrc(media: PerfumeMedia): string {
  if (media.type === "image") return media.src;
  if (media.type === "video") return media.poster ?? "/images/store/xavier-category-perfumes.webp";
  const frame = media.posterFrame ?? 0;
  return `${media.basePath}/frame_${padFrame(frame + 1)}.webp`;
}
