import { Font } from "@react-pdf/renderer";
export function registerResumeFonts(base: string) {
  Font.register({
    family: "ResumeVietnam",
    fonts: [
      { src: `${base}/BeVietnamPro-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/BeVietnamPro-Bold.ttf`, fontWeight: 700 },
      {
        src: `${base}/BeVietnamPro-Italic.ttf`,
        fontStyle: "italic",
        fontWeight: 400,
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}
