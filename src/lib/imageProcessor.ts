export interface ImageAnalysis {
  isValid: boolean;
  width: number;
  height: number;
  sizeMB: number;
  issues: string[];
  suggestions: string[];
  optimizedBase64: string;
}

export async function processImage(imageBase64: string): Promise<ImageAnalysis> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const sizeMB = (imageBase64.length * 0.75) / (1024 * 1024);

      if (width < 500 || height < 500) {
        issues.push("Imagem muito pequena (menos de 500px)");
        suggestions.push("Aproxime a câmera da folha para a escrita ocupar pelo menos 70% da foto");
      }

      if (width > 4000 || height > 4000) {
        issues.push("Imagem muito grande");
        suggestions.push("Imagens muito grandes serão redimensionadas automaticamente");
      }

      if (sizeMB > 5) {
        issues.push(`Imagem grande (${sizeMB.toFixed(1)}MB)`);
        suggestions.push("Imagens acima de 5MB podem demorar mais. O sistema vai reduzir automaticamente");
      }

      const maxDimension = 1200;
      let newWidth = width;
      let newHeight = height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          newWidth = maxDimension;
          newHeight = (height * maxDimension) / width;
        } else {
          newHeight = maxDimension;
          newWidth = (width * maxDimension) / height;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const data = imageData.data;

        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          totalBrightness += brightness;
        }
        const avgBrightness = totalBrightness / (data.length / 4);

        if (avgBrightness < 80) {
          issues.push("Imagem muito escura");
          suggestions.push("Tire a foto em ambiente mais claro ou use o flash");
        } else if (avgBrightness > 220) {
          issues.push("Imagem muito clara (superexposta)");
          suggestions.push("Evite luz excessiva ou flash muito forte");
        }

        const contrast = 1.2;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
        }

        ctx.putImageData(imageData, 0, 0);
      }

      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);

      resolve({
        isValid: issues.length === 0,
        width,
        height,
        sizeMB: parseFloat(sizeMB.toFixed(1)),
        issues,
        suggestions,
        optimizedBase64,
      });
    };

    img.onerror = () => {
      resolve({
        isValid: false,
        width: 0,
        height: 0,
        sizeMB: 0,
        issues: ["Não foi possível carregar a imagem"],
        suggestions: ["Verifique se o arquivo é uma imagem válida (PNG ou JPG)"],
        optimizedBase64: imageBase64,
      });
    };

    img.src = imageBase64;
  });
}
