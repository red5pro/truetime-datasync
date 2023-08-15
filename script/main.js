/* global red5prosdk */
import { query } from "./url-util.js";
import { getCoordinates } from "./coord-util.js";
import Whiteboard from "./whiteboard.js";

const { host, app, streamName } = query();
const { setLogLevel, WHIPClient, WHEPClient } = red5prosdk;

const strokeColorInput = document.querySelector("#stroke-color-input");
const lineWidthInput = document.querySelector("#line-width-input");
const clearButton = document.querySelector("#clear-button");
const canvas = document.querySelector("#whiteboard");
const subscriberCanvas = document.querySelector("#whiteboard-subscriber");

const pubVideo = document.querySelector("#red5pro-publisher");
const pubFit = window.getComputedStyle(pubVideo).getPropertyValue("object-fit");
const pubPosition = window
	.getComputedStyle(pubVideo)
	.getPropertyValue("object-position")
	.split(" ");
const subVideo = document.querySelector("#red5pro-subscriber");
const subFit = window.getComputedStyle(subVideo).getPropertyValue("object-fit");
const subPosition = window
	.getComputedStyle(subVideo)
	.getPropertyValue("object-position")
	.split(" ");

const NAME = "[TrueTime DataSync]";

setLogLevel("debug");

const baseConfig = {
	host: host || window.location.hostname,
	app: app || "live",
	streamName: streamName || `stream-${new Date().getTime()}`,
	mediaConstraints: {
		audio: false,
		video: {
			width: 1280,
			height: 720,
		},
	},
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
		if (event.type === "Publish.Start") {
			handlePublisherResize();
		}
	});
	await publisher.init(baseConfig);
	await publisher.publish();
	startWhiteboard(publisher);
	await startSubscribe();
};

const startWhiteboard = (publisher) => {
	const canvasParent = canvas.parentElement;
	var ro = new ResizeObserver(() => {
		handlePublisherResize();
	});
	canvasParent && ro.observe(canvasParent);
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
						const { x, y, xRatio, yRatio } = data;
						whiteboardSubscriber.update(x, y, xRatio, yRatio);
					} else if (methodName === "whiteboardClear") {
						whiteboardSubscriber.clear();
					} else if (methodName === "whiteboardStart") {
						whiteboardSubscriber.start(data);
					} else if (methodName === "whiteboardStop") {
						whiteboardSubscriber.stop();
					}
				}
			} else if (
				type === "Subscribe.Start" ||
				type === "Subscribe.VideoDimensions.Change"
			) {
				handleSubscriberResize();
			}
		}
	});
	await subscriber.init({
		...baseConfig,
		mediaElementId: "red5pro-subscriber",
	});
	await subscriber.subscribe();
	startSubsciberWhiteboard(subscriber);
};

const startSubsciberWhiteboard = (subscriber) => {
	const canvasParent = subscriberCanvas.parentElement;
	var ro = new ResizeObserver(() => {
		handleSubscriberResize();
	});
	canvasParent && ro.observe(canvasParent);
	// Create a new Whiteboard instance to draw updates on.
	whiteboardSubscriber = new Whiteboard(
		"[Subscriber:Whiteboard]",
		subscriberCanvas,
		undefined,
		false
	);
};

const handlePublisherResize = () => {
	if (whiteboard) {
		const { clientWidth, clientHeight } = pubVideo;
		const { videoWidth, videoHeight } = pubVideo;
		const factor = getCoordinates(
			videoWidth,
			videoHeight,
			clientWidth,
			clientHeight,
			pubFit,
			pubPosition
		);
		console.log(`${NAME} - Publisher`, "factor", factor);
		whiteboard.onResize(factor);
	}
};

const handleSubscriberResize = () => {
	if (whiteboardSubscriber) {
		const { clientWidth, clientHeight } = subVideo;
		const { videoWidth, videoHeight } = subVideo;
		const factor = getCoordinates(
			videoWidth,
			videoHeight,
			clientWidth,
			clientHeight,
			subFit,
			subPosition
		);
		whiteboardSubscriber.onResize(factor);
	}
};

const handleWindowResize = () => {
	handlePublisherResize();
	handleSubscriberResize();
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
