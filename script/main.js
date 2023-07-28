/* global red5prosdk */
import Publisher from "./publisher.js";
import { query } from "./url-util.js";

const { host, app, streamName } = query();
const { setLogLevel, WHIPClient } = red5prosdk;

const NAME = "[TrueTime DataSync]";

setLogLevel("debug");

const baseConfig = {
	host: host || window.location.hostname,
	app: app || "live",
	streamName: streamName || "stream1",
	enableChannelSignaling: true, // WHIP/WHEP specific
	trickleIce: true, // Flag to use trickle ice to send candidates
};
console.log(NAME, "baseConfig", baseConfig);

const pub = new WHIPClient();
pub.init(baseConfig);
pub.publish();
