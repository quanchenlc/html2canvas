let img: HTMLImageElement, canvas: HTMLCanvasElement;

function getCanvas() {
    return document.createElement('canvas');
    if (!canvas) canvas = document.createElement('canvas');
    return canvas;
}
function getImage() {
    return new Image();
    if (!img) img = new Image();
    return img;
}
/**
 * 检测图片是否能被绘制到canvas上；
 * @param src
 * @returns
 */
function checkImgDrawEnabled(src: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = getImage();
        img.onload = () => {
            console.log('onload', img.width, img.height);
            const canvas = getCanvas();
            canvas.width = img.width;
            canvas.height = img.height;
            const cxt = canvas.getContext('2d');
            try {
                cxt?.drawImage(img, 0, 0);
                // const dataURL = canvas.toDataURL('image/jpeg', 0.1);
                console.log('canvas can draw and toDataURL');
                resolve(true);
            } catch (error) {
                console.log('on canvas toDataURL:', error);
                resolve(false);
            }
        };
        img.crossOrigin = 'anonymous';
        img.onerror = (e: any) => {
            console.error('on img error', e);
            resolve(false);
        };
        img.src = src;
    });
}

export {checkImgDrawEnabled};
