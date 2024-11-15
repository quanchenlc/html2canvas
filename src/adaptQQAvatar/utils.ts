function findAllTags(element: any, tagName = 'img') {
    if (!element) return [];
    var result: HTMLElement[] = [];
    if (element.tagName.toLocaleLowerCase() === tagName) {
        result.push(element);
    }
    for (var child of element.children) {
        result = result.concat(findAllTags(child, tagName));
    }
    return result;
}

export {findAllTags};
