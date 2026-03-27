// Mock scrollIntoView which doesn't exist in jsdom
Element.prototype.scrollIntoView = () => {}
