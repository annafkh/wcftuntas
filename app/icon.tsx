import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(6,182,212,1) 100%)",
          color: "white",
          fontSize: 180,
          fontWeight: 800,
          letterSpacing: -12,
        }}
      >
        WF
      </div>
    ),
    size,
  );
}
