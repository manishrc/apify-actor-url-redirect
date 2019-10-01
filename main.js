const Apify = require("apify");
const normalizeUrl = require("normalize-url");
const rp = require("request-promise");
const pMap = require("p-map");
const R = require("ramda");

const normalize = url => {
  return normalizeUrl(url, {
    removeQueryParameters: ["ref", /^utm_\w+/i],
    removeDirectoryIndex: [/^default\.[a-z]+$/, /^index\.[a-z]+$/],
    stripHash: true
  });
};

Apify.main(async () => {
  const input = await Apify.getInput();
  console.log("Input:");
  console.dir(input);

  if (!input || !input.sources)
    throw new Error('Input must be a JSON object with the "sources" field!');

  const { crawlerOptionsOverrides } = input;
  const namespace = input.namespace || "default";

  const prepareUrls = async source => {
    const { userData } = source;

    if (source.requestsFromUrl) {
      const urlListfile = await rp(source.requestsFromUrl);

      return urlListfile
        .split("\n")
        .filter(url => !!url)
        .map(url => ({
          userData: { ...userData, origionalUrl: url },
          url: normalize(url)
        }));
    }

    if (source.url) {
      return {
        ...source,
        userData: { ...userData, origionalUrl: source.url },
        url: normalize(source.url)
      };
    }
  };

  sourceUrls = await pMap(input.sources, prepareUrls, { concurrency: 5 });

  const requestList = new Apify.RequestList({
    sources: R.flatten(sourceUrls),
    persistStateKey: `redirect-state-${input.namespace}`,
    persistSourcesKey: `redirect-state-${input.namespace}`
  });

  await requestList.initialize();

  const basicCrawler = new Apify.PuppeteerCrawler({
    stealth: true,
    handlePageTimeoutSecs: 10,
    ...crawlerOptionsOverrides,
    requestList,
    gotoFunction: async ({ page, request }) => {
      request.userData.lable = "modified";
      await Apify.utils.puppeteer.blockRequests(page);
      return page.goto(request.url);
    },
    handlePageFunction: async ({ request, page, response }) => {
      await page.waitFor(2000);

      let metarefresh;
      try {
        const metarefresh = await page.$eval(
          "meta[http-equiv=refresh]",
          meta =>
            ((meta.getAttribute("content") || "").match(/url=(.*)/) || [])[1]
        );
      } catch (e) {}

      const { origionalUrl } = request.userData;
      const normalizedOrigionalUrl = normalize(origionalUrl);
      const loadedUrl = await page.url();
      const normalizedloadedUrl = normalize(loadedUrl);
      const title = await page.title();
      const ip = (await response.remoteAddress()).ip;
      const statusCode = await response.status();
      const statusText = await response.statusText();
      const isOk = await response.ok();

      await Apify.pushData({
        origionalUrl,
        normalizedOrigionalUrl,
        loadedUrl,
        normalizedloadedUrl,
        title,
        ip,
        statusCode,
        statusText,
        isOk,
        metarefresh
      });
    },

    handleFailedRequestFunction: async ({ request }) => {
      const { origionalUrl } = request.userData;
      const normalizedOrigionalUrl = request.url;
      const { errorMessages } = request.errorMessages;

      await Apify.pushData({
        origionalUrl,
        normalizedOrigionalUrl,
        "#errorMessage": errorMessages,
        "#isFailed": true
      });
    }
  });

  await basicCrawler.run();
});
