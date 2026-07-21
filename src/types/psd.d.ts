declare module 'psd.js' {
  const PSD: {
    fromArrayBuffer(buffer: ArrayBuffer): {
      parse(): void;
      image: {
        toPng(): HTMLCanvasElement;
      };
    };
  };
  export default PSD;
}
