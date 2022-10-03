import { Actor } from "apify";
import { Dataset, PlaywrightCrawler, RequestList } from "crawlee";
import fetch from "node-fetch";
import normalizeUrl from "./lib/normalize-url.js";
import pTimeout from "./lib/p-timeout.js";
import prepareRequestListFromText from "./lib/prepare-request-list.js";
let requestUrls;

Actor.main(async () => {
  // Get Input & Validate
  const input = await Actor.getInput();
  const inputText = input.urlList;
  const remoteTextFile = (input.sources || {}).requestsFromUrl;

  // console.log({ inputText, remoteTextFile });

  if (!(inputText || remoteTextFile))
    throw new Error(
      "Input must have sources. Please refer docs for this actor."
    );

  // Get urlList content
  if (inputText) {
    requestUrls = prepareRequestListFromText(inputText);
  }

  if (remoteTextFile) {
    const res = await fetch(remoteTextFile);
    const urlList = await res.text();
    requestUrls = prepareRequestListFromText(urlList);
  }

  // Get actor config
  const { crawlerOptionsOverrides } = input;

  const requestList = await RequestList.open(
    `${process.env.APIFY_ACTOR_RUN_ID}-list`,
    requestUrls
  );

  async function requestHandler({ request, page, response }) {
    let metarefresh, statusCode, statusText, isOk, ip;

    await page.waitForTimeout(2000);

    const loadedUrl = await page.url();
    const loadedUrlNormalized = normalizeUrl(loadedUrl);
    const origionalUrl = request.userData.origionalUrl;

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
    isOk = await response.ok();
    statusText = await response.statusText();
    statusCode = await response.status();

    try {
      const serverAddr = await response.serverAddr();
      ip = serverAddr.ipAddress;
    } catch (e) {
      ip = e.name;
    }

    const result = {
      origionalUrl,
      loadedUrl,
      loadedUrlNormalized,
      isOk,
      metarefresh,
      statusCode,
      statusText,
      ip,
    };

    await Actor.pushData(result);
  }

  async function failedRequestHandler({ request }) {
    const origionalUrl = request.userData.origionalUrl;
    const attemptedUrl = request.url;
    const { errorMessages } = request.errorMessages;

    const result = {
      origionalUrl,
      attemptedUrl,
      "#errorMessage": errorMessages,
      "#isFailed": true,
    };

    console.log("RESULT");
    console.log(result);
    await Actor.pushData(result);
  }

  const crawler = new PlaywrightCrawler({
    requestList,
    requestHandler,
    failedRequestHandler,
    requestHandlerTimeoutSecs: 10,
    ...crawlerOptionsOverrides,
  });

  await crawler.run();
});
