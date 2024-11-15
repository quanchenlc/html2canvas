const cache: string[] = [];

function loadScript(url: string) {
    if (cache.includes(url)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        var script: any = document.createElement('script') as HTMLScriptElement;
        script.type = 'text/javascript';
        if (script.readyState) {
            //IE
            script.onreadystatechange = function () {
                if (script.readyState == 'loaded' || script.readyState == 'complete') {
                    script.onreadystatechange = null;
                    cache.push(url);
                    resolve(true);
                } else {
                    reject(new Error('load script error'));
                }
            };
        } else {
            //Others
            script.onload = function () {
                cache.push(url);
                resolve(true);
            };
        }
        script.src = url;
        document.body.appendChild(script);
    });
}

export {loadScript};
