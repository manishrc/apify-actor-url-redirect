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
    <td>namespace</td>
    <td>String</td>
    <td>Uses this namespace to persist requests</td>
  </tr>
  <tr>
    <td>sources</td>
    <td>Array</td>
    <td>(Option 1) Array of URLs to resolve in the format: `{"url": "https://manishrc.com"}`</td>
  </tr>
  <tr>
    <td>sources.requestsFromUrl</td>
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
  "normalizedUrl": "http://www.google.com",
  "loadedUrl": "https://www.google.com",
  "#errorMessage": "[<errors>]",
  "#isFailed": "<true/false>"
}
```
