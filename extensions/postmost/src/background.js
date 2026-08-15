// Service worker for PostMost extension.
// No persistent logic yet; the popup and content scripts handle storage and messaging.
chrome.runtime.onInstalled.addListener(() => {
  console.log("PostMost extension installed");
});
