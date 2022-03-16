1. $ issue: jquery should be injected before index.js
2. #bottomalign is called before DOM is rendered. need to move js code at the bottom of the page. plus, align() is called twice. commented out the second one.
3.     <script href="../common.js" type="text/javascript"></script> url is wrong
4. script tag matches src, not href
5. js needs to be at the bottom of the page to increase loading speed. moved them.
6. For the word count chart, I assume we want to count the total number for words in each BodyHtml of test_feed.json. Also, zero count is not displayed in the chart.
