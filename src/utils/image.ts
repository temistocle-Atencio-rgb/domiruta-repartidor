/**
 * Utilidad para reducir la foto de entrega en el navegador usando un canvas:
 * 1. Lado mayor de 800 px, JPEG con calidad 0.6.
 * 2. Si pasa de 340.000 caracteres, repite con calidad 0.4.
 * 3. Si después de calidad 0.4 sigue pasando de 340.000 caracteres, reduce el lado
 *    mayor a 600 px y prueba otra vez con calidad 0.5.
 * 4. Si aún así pasa de 340.000 caracteres, arroja el error "La foto es muy pesada. Toma otra".
 */

export function comprimirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo de la foto.'));
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('No se pudo procesar la imagen.'));
      };

      img.onload = () => {
        const calcularDimensiones = (maxLado: number) => {
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxLado) {
              h = Math.round((h * maxLado) / w);
              w = maxLado;
            }
          } else {
            if (h > maxLado) {
              w = Math.round((w * maxLado) / h);
              h = maxLado;
            }
          }
          return { w, h };
        };

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el lienzo para procesar la foto.'));
          return;
        }

        // Paso 1: Lado mayor 800 px
        const dim800 = calcularDimensiones(800);
        canvas.width = dim800.w;
        canvas.height = dim800.h;
        ctx.drawImage(img, 0, 0, dim800.w, dim800.h);

        let dataUrl = canvas.toDataURL('image/jpeg', 0.6);

        // Paso 2: Si pasa de 340.000 caracteres, probar con calidad 0.4
        if (dataUrl.length > 340000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.4);
        }

        // Paso 3: Si sigue pasando de 340.000 caracteres, reducir a 600 px con calidad 0.5
        if (dataUrl.length > 340000) {
          const dim600 = calcularDimensiones(600);
          canvas.width = dim600.w;
          canvas.height = dim600.h;
          ctx.clearRect(0, 0, dim600.w, dim600.h);
          ctx.drawImage(img, 0, 0, dim600.w, dim600.h);
          dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        }

        // Paso 4: Si aún así pasa, indicar que la foto es muy pesada
        if (dataUrl.length > 340000) {
          reject(new Error('La foto es muy pesada. Toma otra'));
          return;
        }

        resolve(dataUrl);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
