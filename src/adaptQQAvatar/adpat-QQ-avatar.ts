import {checkImgDrawEnabled} from './check-Img-draw-enabled';
import {loadScript} from './load-script';
import {findAllTags} from './utils';

export interface AdpatQQAvatarOptions {
    adpatQQAvatar: boolean;
}

async function adpatQQAvatar(element: HTMLElement) {
    // console.log('adpatQQAvatar element:', element);
    const imgs = findAllTags(element, 'img');
    // console.log('adpatQQAvatar imgs:', imgs);
    for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        const src = img.getAttribute('src');
        if (src) {
            const dataURL = await transformSrc(src);
            img.setAttribute('src', dataURL);
            // console.log('adpatQQAvatar dataURL:', dataURL);
        }
    }
}

async function transformSrc(src: string): Promise<string> {
    // 是否满足QQ头像路径规则；
    if (!src.match(/\.qlogo\.cn/)) {
        return Promise.resolve(src);
    }
    // 是否能绘制到canvas上；
    const enabled = await checkImgDrawEnabled(src);
    if (enabled) {
        return Promise.resolve(src);
    }
    await loadScript('//open.mobile.qq.com/sdk/qqapi.js?_bid=152');
    const dataURL = (await mqqGetUrlImage(src)) as string;
    return Promise.resolve(dataURL);
}

function mqqGetUrlImage(url: string) {
    // @ts-ignore;
    const mqq: any = window.mqq;
    if (!mqq) {
        console.error('mqq is not defined');
        return Promise.resolve(url);
    }
    return new Promise((resolve) => {
        const callid = 'shareImg';
        mqq.data.getUrlImage(
            {
                callid,
                url: url + '23123'
            },
            (data: any) => {
                console.log('mqq.data.getUrlImage:', data);
                if (data.ret == 0 && data.response && data.response.callid == callid) {
                    var base64 = data.response.data;
                    // mqq.iOS &&
                    // (base64 = base64.replace("data:image/jpeg;", "data:image/jpg;"));
                    // base64 = base64.replace('data:image/jpeg;', 'data:image/jpg;');
                    resolve(base64);
                    //IOS里面不支持png与jpeg，如果是canvas导出的图片，将jpeg替换成jpg
                } else {
                    resolve(url);
                }
            }
        );
    });
}

export {adpatQQAvatar};
