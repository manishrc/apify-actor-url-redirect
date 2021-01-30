# Apify Actor - URL Redirects

For a list of input URLs, get a list of final URLs that are loaded after redirects.

## Input parameters

<table>
<thead>
  <tr>
    <td>Field</td>
    <td>Type</td>
    <td>Description</td>
  </tr>
</thead>
<tbody>
  <tr>
    <td>urlList</td>
    <td>String</td>
    <td>(Option 1) List of URLs. One per line.`</td>
  </tr>
  <tr>
    <td>sources.requestsFromUrl (soon)</td>
    <td>String</td>
    <td>(Option 2) URL to a file with the list of URLs</td>
  </tr>
  <tr>
  <td>crawlerOptionsOverrides</td>
  <td>Object</td>
  <td>Crawler options Overrides. [See for overrides ↗](https://sdk.apify.com/docs/api/basiccrawler#new-basiccrawleroptions)</td>
  </tr>
</tbody>
</table>

## Output

```json
{
  "origionalUrl": "http://google.com/",
  "attemptedUrl": "http://www.google.com",
  "loadedUrl": "https://www.google.com/",
  "loadedUrlNormalized": "https://www.google.com",
  "isOk": true,
  "statusCode": 200,
  "statusText": "",
  "#errorMessage": "[<errors>]",
  "#isFailed": "<true/false>"
}
```
