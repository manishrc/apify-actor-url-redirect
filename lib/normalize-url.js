import normalize from "normalize-url";

const normalizeUrl = (url) => {
  try {
    return normalize(url, {
      removeQueryParameters: ["ref", /^utm_\w+/i],
      removeDirectoryIndex: [/^default\.[a-z]+$/i, /^index\.[a-z]+$/i],
      stripHash: true,
    });
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default normalizeUrl;
