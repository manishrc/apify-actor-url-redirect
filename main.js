const Apify = require("apify");
const normalize = require("normalize-url");

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

const pTimeout = (duration) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(null);
    }, duration);
  });

const urlToRequest = (url) => ({
  url: normalizeUrl(url),
  userData: { origionalUrl: url },
  uniqueKey: url,
});

const prepareRequestListFromText = (text) => text.split("\n").map(urlToRequest);

Apify.main(async () => {
  const input = await Apify.getInput();
  const { crawlerOptionsOverrides } = input;

  if (!input.urlList && !typeof input.urlList === "string")
    throw new Error("Input must be string with url in each line.");

  const requestList = new Apify.RequestList({
    sources: prepareRequestListFromText(input.urlList),
    persistRequestsKey: `${process.env.APIFY_ACTOR_RUN_ID}-request-key`,
    persistStateKey: `${process.env.APIFY_ACTOR_RUN_ID}-state-key`,
    keepDuplicateUrls: true,
  });
  await requestList.initialize();

  const handlePageFunction = async ({ request, page, response }) => {
    let metarefresh, statusCode, statusText, isOk;
    await page.waitForTimeout(2000);

    // Get MetaRefresh URL
    try {
      metarefresh = await Promise.race([
        page.$eval(
          "meta[http-equiv=refresh]",
          (meta) =>
            ((meta.getAttribute("content") || "").match(/url=(.*)/) || [])[1]
        ),
        pTimeout(500),
      ]);
    } catch (e) {}

    // Get IP, StatusCode, StatusText, Is "OK"?
    try {
      ip = (await response.remoteAddress()).ip;
      statusCode = await response.status();
      statusText = await response.statusText();
      isOk = await response.ok();
    } catch (e) {}

    const loadedUrl = await page.url();
    const loadedUrlNormalized = normalizeUrl(loadedUrl);

    const result = {
      origionalUrl: request.userData.origionalUrl,
      loadedUrl,
      loadedUrlNormalized,
      isOk,
      metarefresh,
      statusCode,
      statusText,
    };

    await Apify.pushData(result);
  };

  const handleFailedRequestFunction = async ({ request }) => {
    const { origionalUrl } = request.userData;
    const attemptedUrl = request.url;
    const { errorMessages } = request.errorMessages;

    await Apify.pushData({
      origionalUrl,
      attemptedUrl,
      "#errorMessage": errorMessages,
      "#isFailed": true,
    });
  };

  const crawler = new Apify.PuppeteerCrawler({
    handlePageTimeoutSecs: 10,
    ...crawlerOptionsOverrides,
    handlePageFunction,
    handleFailedRequestFunction,
    requestList,
  });

  await crawler.run();
});
