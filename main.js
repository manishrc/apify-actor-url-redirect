const Apify = require("apify");
const normalizeUrl = require("normalize-url");
const rp = require("request-promise");

Apify.main(async () => {
  const input = await Apify.getInput();
  console.log("Input:");
  console.dir(input);

  if (!input || !input.sources)
    throw new Error('Input must be a JSON object with the "sources" field!');

  const { crawlerOptionsOverrides } = input;

  const requestList = await Apify.openRequestList(
    `redirect-request-list-${input.namespace || "default"}`,
    input.sources
  );

  const basicCrawler = new Apify.BasicCrawler({
    ...crawlerOptionsOverrides,
    requestList,
    handleRequestFunction: async ({ request }) => {
      const origionalUrl = request.url;
      const normalizedUrl = normalizeUrl(origionalUrl);

      const loadedUrl = (await rp({
        url: request.url,
        followRedirect: true,
        followAllRedirects: true,
        resolveWithFullResponse: true
      }))["request"]["uri"]["href"];

      await Apify.pushData({
        origionalUrl,
        normalizedUrl,
        loadedUrl
      });
    },

    handleFailedRequestFunction: async ({ request }) => {
      const origionalUrl = request.url;
      const normalizedUrl = normalizeUrl(origionalUrl);
      const errorMessage = (request.errorMessages[0] || "").split("\n")[0];

      await Apify.pushData({
        origionalUrl,
        normalizedUrl,
        errorMessage,
        "#isFailed": true
      });
    }
  });

  await basicCrawler.run();
});
