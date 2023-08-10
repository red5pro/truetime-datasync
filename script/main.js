/* global red5prosdk */
import Publisher from "./publisher.js";
import { query } from "./url-util.js";
import Whiteboard from "./whiteboard.js";

const { host, app, streamName } = query();
const { setLogLevel, WHIPClient, WHEPClient } = red5prosdk;

const strokeColorInput = document.querySelector("#stroke-color-input");
const lineWidthInput = document.querySelector("#line-width-input");
const clearButton = document.querySelector("#clear-button");
const canvas = document.querySelector("#whiteboard");
const subscriberCanvas = document.querySelector("#whiteboard-subscriber");

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

let publisher, whiteboard;
let subscriber, whiteboardSubscriber;

const startPublish = async () => {
	// Create a new Publisher instance.
	publisher = new WHIPClient();
	publisher.on("*", (event) => {
		console.log("[Publisher]", event.type);
	});
	await publisher.init(baseConfig);
	await publisher.publish();
	startWhiteboard(publisher);
	startSubscribe();
};

const startWhiteboard = (publisher) => {
	// Create a new Whiteboard instance.
	whiteboard = new Whiteboard("[Publisher:Whiteboard]", canvas, publisher);
	strokeColorInput.addEventListener("change", (e) => {
		whiteboard.onStrokeColorChange(e.target.value);
	});

	lineWidthInput.addEventListener("change", (e) => {
		whiteboard.onLineWidthChange(parseInt(e.target.value, 10));
	});
	clearButton.addEventListener("click", () => {
		whiteboard.clear();
	});
};

const startSubscribe = async () => {
	// Create a new Subscriber instance.
	subscriber = new WHEPClient();
	subscriber.on("*", (event) => {
		const { type } = event;
		if (type !== "Subscribe.Time.Update") {
			console.log("[Subscriber]", type);
			if (type === "Subscribe.Send.Invoke") {
				const { methodName, data } = event.data;
				if (whiteboardSubscriber) {
					if (methodName === "whiteboardDraw") {
						const { x, y } = data;
						whiteboardSubscriber.update(x, y);
					} else if (methodName === "whiteboardClear") {
						whiteboardSubscriber.clear();
					} else if (methodName === "whiteboardStart") {
						whiteboardSubscriber.start(data);
					} else if (methodName === "whiteboardStop") {
						whiteboardSubscriber.stop();
					}
				}
			}
		}
	});
	await subscriber.init({
		...baseConfig,
		mediaElementId: "red5pro-subscriber",
	});
	await subscriber.subscribe();
	// Create a new Whiteboard instance to draw updates on.
	whiteboardSubscriber = new Whiteboard(
		"[Subscriber:Whiteboard]",
		subscriberCanvas
	);
};

const handleWindowResize = () => {
	if (whiteboard) {
		whiteboard.onResize();
	}
};

const shutdown = () => {
	if (publisher) {
		publisher.unpublish();
	}
	if (subscriber) {
		subscriber.unsubscribe();
	}
};

window.addEventListener("pagehide", shutdown);
window.addEventListener("beforeunload", shutdown);
window.addEventListener("resize", handleWindowResize);
document.addEventListener("DOMContentLoaded", handleWindowResize);
startPublish();
