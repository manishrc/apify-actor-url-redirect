import { Actor } from "apify";
import { Dataset, PlaywrightCrawler, RequestList } from "crawlee";
import fetch from "node-fetch";
import normalizeUrl from "./lib/normalize-url.js";
import pTimeout from "./lib/p-timeout.js";
import prepareRequestListFromText from "./lib/prepare-request-list.js";

await Actor.init();

// Get Input & Validate
const input = await Actor.getInput();
if (!input) throw new Error("Input must provided.");
if (!input?.urlList && !typeof input?.urlList === "string")
  throw new Error("Input must be string with url in each line.");

// Get urlList content
const res = await fetch(input.urlList);
const urlList = await res.text();

if (!urlList == "string" && urlList.length <= 0) {
  throw new Error("Input must be string with url in each line.");
}

// Get actor config
const { crawlerOptionsOverrides } = input;

const requestList = await RequestList.open(
  `${process.env.APIFY_ACTOR_RUN_ID}-list`,
  prepareRequestListFromText(urlList)
);

async function requestHandler({ request, page }) {
  let metarefresh, statusCode, statusText, isOk, ip;
  await page.waitForTimeout(2000);
  const response = await page.waitForResponse((url) => true);

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

  console.log("✅ requestHandler.request.userData", origionalUrl);
  console.log("✅ result", result);
  await Dataset.pushData(result);
}

async function failedRequestHandler({ request }) {
  console.log("request.useData", request.useData());
  const { origionalUrl } = "request?.useData";
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
  await Dataset.pushData(result);
}

const crawler = new PlaywrightCrawler({
  requestList,
  requestHandler,
  failedRequestHandler,
  requestHandlerTimeoutSecs: 10,
  ...crawlerOptionsOverrides,
});

await crawler.run();
