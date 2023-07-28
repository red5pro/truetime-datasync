/* global red5prosdk */
import Publisher from "./publisher.js";
import { query } from "./url-util.js";

const { host, app, streamName } = query();
const { setLogLevel } = red5prosdk;

const NAME = "[TrueTime DataSync]";

setLogLevel("debug");

const baseConfig = {
	host: host || window.location.hostname,
	app: app || "live",
	streamName: streamName || "stream1",
};
console.log(NAME, "baseConfig", baseConfig);

const publisher = new Publisher();
