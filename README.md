# Red5 TrueTime Data Synchronization

This web application demonstrates sending drawing routine information from a broadcaster to all subscribers. The subscribers receieves the information as metadata and overlays the drawing routine on its own playback in true time.

Browser environment and element styles and rendering have been considered with regards to the `object-fit` CSS property that can assigned to `video` elements. The aspect ratio and scale of the sender's view is transferred over and transposed for all subscribers regardless of their own layout and `object-fit` value so the drawing on the receivers' end is shown in the same position as the drawing on the sender's end.

# Project Structure

The following defines the role of the relevant files for the project.

> Please view the files individually for more comments and information.

## index.html

The [index.html](index.html) only and main HTML page of the TrueTime DataSync.

## script/main.js

The [main.js](script/main.js) file is the main entry for the application and is loaded as a `module`.

## script/coord-util.js

The [coord-util.js](script/coord-util.js) file utility method(s) to help in transposing coordinates being received to those being viewed.

## script/url-uril.js

The [url-util.js](script/url-util.js) file provides utility methods in accessing query parameters for configuration and setup.

> See [Query Params](#query-params) section for more information about the supported query parameters.

## script/whiteboard.js

The [whiteboard.js](script/whiteboard.js) file provides a `Whiteboard` class for both publishers and subscribers to utilize. For publishers it will serve as a drawing service that sends out drawing routine metadata. For subcribers it is a surface to relay the receieved drawing routines.

It stores a history of drawing routines so it can re-create the display on resize of browser window, as well as in the case of change to incoming video resolution which occurs on Adaptive Bitrate control for subscribers.

## style/main.css

The [main.css](css/main.css) file provides the default style declarations of TrueTime DataSync app.

## style/publisher.css

The [publisher.css](css/publisher.css) file provides style declarations for the publisher related UI which includes the drawing tools, whiteboard and publish stream container.

## style/subscriber.css

The [subscriber.css](css/subscriber.css) file provides style declaration for the subscriber related UI.

## Run Locally

This project was setup using [Vite](https://vitejs.dev/).

```sh
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your favorite browser.

## Build

To build the project, issue the following (after having already run `npm install`):

```sh
npm run build
```

This will generate the built files in a `dist` directory.

# Usage

When using the TrueTime DataSync webapp, you can send live drawing routines to all subscribers of the publisher. The drawing routines are delived as metadata and are in response to mouse movements and selected tools - such as line width and color.

In a `pubsub` mode, the publisher and drawing tools are located at the top of the page, while the subscriber receiving the drawing routine information is located below. While drawing on the published stream, you will see the same drawing be overlayed on the subscriber stream in true time.

## Query Params

The following query parameters are available. Though _optional_, it is recommended to use in order to properly configure your TrueTime Multi-View session.
