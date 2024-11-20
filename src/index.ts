import {Bounds, parseBounds, parseDocumentSize} from './css/layout/bounds';
import {COLORS, isTransparent, parseColor} from './css/types/color';
import {CloneConfigurations, CloneOptions, DocumentCloner, WindowOptions} from './dom/document-cloner';
import {isBodyElement, isHTMLElement, parseTree} from './dom/node-parser';
import {CacheStorage} from './core/cache-storage';
import {CanvasRenderer, RenderConfigurations, RenderOptions} from './render/canvas/canvas-renderer';
import {ForeignObjectRenderer} from './render/canvas/foreignobject-renderer';
import {Context, ContextOptions} from './core/context';
import {naviteGetComputedStyle} from './nativeGetComputeStyle';
import {AdpatQQAvatarOptions, adpatQQAvatar} from './adaptQQAvatar/adpat-QQ-avatar';

export type Options = CloneOptions &
    WindowOptions &
    RenderOptions &
    ContextOptions &
    AdpatQQAvatarOptions & {
        backgroundColor: string | null;
        foreignObjectRendering: boolean;
        removeContainer?: boolean;
        cacheDocumentElement?: boolean;
    };

const html2canvas = (
    elementOrSelector: HTMLElement | string,
    options: Partial<Options> = {}
): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
        setTimeout(resolve,0);
    }).then(() => {
        return renderElement(elementOrSelector, options);
    });
};

export default html2canvas;

if (typeof window !== 'undefined') {
    CacheStorage.setContext(window);
}

const renderElement = async (
    elementOrSelector: HTMLElement | string,
    opts: Partial<Options>
): Promise<HTMLCanvasElement> => {
    if (!elementOrSelector || !(typeof elementOrSelector === 'object' || typeof elementOrSelector === 'string')) {
        return Promise.reject('Invalid element provided as first argument');
    }
    const element = (
        typeof elementOrSelector === 'object' ? elementOrSelector : document.querySelector(elementOrSelector)
    ) as HTMLElement;
    const ownerDocument = element.ownerDocument;

    if (!ownerDocument) {
        throw new Error(`Element is not attached to a Document`);
    }

    const defaultView = ownerDocument.defaultView;

    if (!defaultView) {
        throw new Error(`Document is not attached to a Window`);
    }

    const resourceOptions = {
        allowTaint: opts.allowTaint ?? false,
        imageTimeout: opts.imageTimeout ?? 15000,
        proxy: opts.proxy,
        useCORS: opts.useCORS ?? false
    };

    const contextOptions = {
        logging: opts.logging ?? true,
        cache: opts.cache,
        ...resourceOptions
    };

    const windowOptions = {
        windowWidth: opts.windowWidth ?? defaultView.innerWidth,
        windowHeight: opts.windowHeight ?? defaultView.innerHeight,
        scrollX: opts.scrollX ?? defaultView.pageXOffset,
        scrollY: opts.scrollY ?? defaultView.pageYOffset
    };

    const windowBounds = new Bounds(
        windowOptions.scrollX,
        windowOptions.scrollY,
        windowOptions.windowWidth,
        windowOptions.windowHeight
    );

    const context = new Context(contextOptions, windowBounds);

    const foreignObjectRendering = opts.foreignObjectRendering ?? false;

    const cloneOptions: CloneConfigurations = {
        allowTaint: opts.allowTaint ?? false,
        onclone: opts.onclone,
        ignoreElements: opts.ignoreElements,
        inlineImages: foreignObjectRendering,
        copyStyles: foreignObjectRendering,
        adpatQQAvatar: opts.adpatQQAvatar ?? false,
        cacheDocumentElement: opts.cacheDocumentElement ?? true
    };

    context.logger.debug(
        `Starting document clone with size ${windowBounds.width}x${
            windowBounds.height
        } scrolled to ${-windowBounds.left},${-windowBounds.top}`
    );
    
    const documentCloner = new DocumentCloner(context, elementOrSelector, cloneOptions);
    const clonedElement = documentCloner.clonedReferenceElement;
    
    // adpat qq avatr;
    if (cloneOptions.adpatQQAvatar) {
        const dom = clonedElement?.children[1];
        if (dom) await adpatQQAvatar(dom as HTMLElement);
    }

    if (!clonedElement) {
        return Promise.reject(`Unable to find element in cloned iframe`);
    }
    
    const container = await documentCloner.toIFrame(ownerDocument, windowBounds);
    const {width, height, left, top} =
        isBodyElement(clonedElement) || isHTMLElement(clonedElement)
            ? parseDocumentSize(clonedElement.ownerDocument)
            : parseBounds(context, clonedElement);
    
    const backgroundColor = parseBackgroundColor(context, clonedElement, opts.backgroundColor);
    
    const renderOptions: RenderConfigurations = {
        canvas: opts.canvas,
        backgroundColor,
        scale: opts.scale ?? defaultView.devicePixelRatio ?? 1,
        x: (opts.x ?? 0) + left,
        y: (opts.y ?? 0) + top,
        width: opts.width ?? Math.ceil(width),
        height: opts.height ?? Math.ceil(height)
    };

    let canvas;

    if (foreignObjectRendering) {
        context.logger.debug(`Document cloned, using foreign object rendering`);
        const renderer = new ForeignObjectRenderer(context, renderOptions);
        canvas = await renderer.render(clonedElement);
    } else {
        context.logger.debug(
            `Document cloned, element located at ${left},${top} with size ${width}x${height} using computed rendering`
        );

        context.logger.debug(`Starting DOM parsing`);
        const root = parseTree(context, clonedElement);

        if (backgroundColor === root.styles.backgroundColor) {
            root.styles.backgroundColor = COLORS.TRANSPARENT;
        }

        context.logger.debug(
            `Starting renderer for element at ${renderOptions.x},${renderOptions.y} with size ${renderOptions.width}x${renderOptions.height}`
        );

        const renderer = new CanvasRenderer(context, renderOptions);
        canvas = await renderer.render(root);
    }

    if (opts.removeContainer ?? true) {
        if (!DocumentCloner.destroy(container)) {
            context.logger.error(`Cannot detach cloned iframe as it is not in the DOM anymore`);
        }
    }

    context.logger.debug(`Finished rendering`);
    return canvas;
};

const parseBackgroundColor = (context: Context, element: HTMLElement, backgroundColorOverride?: string | null) => {
    const ownerDocument = element.ownerDocument;
    // http://www.w3.org/TR/css3-background/#special-backgrounds
    const documentBackgroundColor = ownerDocument.documentElement
        ? parseColor(context, naviteGetComputedStyle(ownerDocument.documentElement).backgroundColor as string)
        : COLORS.TRANSPARENT;
    const bodyBackgroundColor = ownerDocument.body
        ? parseColor(context, naviteGetComputedStyle(ownerDocument.body).backgroundColor as string)
        : COLORS.TRANSPARENT;

    const defaultBackgroundColor =
        typeof backgroundColorOverride === 'string'
            ? parseColor(context, backgroundColorOverride)
            : backgroundColorOverride === null
            ? COLORS.TRANSPARENT
            : 0xffffffff;

    return element === ownerDocument.documentElement
        ? isTransparent(documentBackgroundColor)
            ? isTransparent(bodyBackgroundColor)
                ? defaultBackgroundColor
                : bodyBackgroundColor
            : documentBackgroundColor
        : defaultBackgroundColor;
};
