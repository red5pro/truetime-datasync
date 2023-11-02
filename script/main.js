/*
Copyright © 2015 Infrared5, Inc. All rights reserved.

The accompanying code comprising examples for use solely in conjunction with Red5 Pro (the "Example Code")
is  licensed  to  you  by  Infrared5  Inc.  in  consideration  of  your  agreement  to  the  following
license terms  and  conditions.  Access,  use,  modification,  or  redistribution  of  the  accompanying
code  constitutes your acceptance of the following license terms and conditions.

Permission is hereby granted, free of charge, to you to use the Example Code and associated documentation
files (collectively, the "Software") without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The Software shall be used solely in conjunction with Red5 Pro. Red5 Pro is licensed under a separate end
user  license  agreement  (the  "EULA"),  which  must  be  executed  with  Infrared5,  Inc.
An  example  of  the EULA can be found on our website at: https://account.red5pro.com/assets/LICENSE.txt.

The above copyright notice and this license shall be included in all copies or portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,  INCLUDING  BUT
NOT  LIMITED  TO  THE  WARRANTIES  OF  MERCHANTABILITY, FITNESS  FOR  A  PARTICULAR  PURPOSE  AND
NONINFRINGEMENT.   IN  NO  EVENT  SHALL INFRARED5, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN  AN  ACTION  OF  CONTRACT,  TORT  OR  OTHERWISE,  ARISING  FROM,  OUT  OF  OR  IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/* global red5prosdk */
import { query } from './url-util.js'
import { getCoordinates } from './coord-util.js'
import Whiteboard, { MESSAGES } from './whiteboard.js'
import DataChannelTransport from './datachannel-transport.js'
import KLVTransport from './klv-transport.js'

const { host, app, streamName, feedName, get } = query()
const { setLogLevel, WHIPClient, WHEPClient } = red5prosdk

const fit = get('fit') || 'contain'
const mode = get('mode') || 'pubsub'
const transportType = get('transport') || 'datachannel'

const strokeColorInput = document.querySelector('#stroke-color-input')
const lineWidthInput = document.querySelector('#line-width-input')
const clearButton = document.querySelector('#clear-button')
const canvas = document.querySelector('#whiteboard')
const subscriberCanvas = document.querySelector('#whiteboard-subscriber')

const pubContainer = document.querySelector('.broadcast-container')
const pubVideo = document.querySelector('#red5pro-publisher')
pubVideo.style.objectFit = fit
const pubFit = window.getComputedStyle(pubVideo).getPropertyValue('object-fit')

const subContainer = document.querySelector('.subscribe-container')
const subVideo = document.querySelector('#red5pro-subscriber')
subVideo.style.objectFit = fit
const subFit = window.getComputedStyle(subVideo).getPropertyValue('object-fit')

const NAME = '[TrueTime DataSync]'
/**
 * Map of KLV message types to textual message types.
 */
export const MESSAGE_TYPES = {
  1: MESSAGES.WHITEBOARD_START,
  2: MESSAGES.WHITEBOARD_DRAW,
  3: MESSAGES.WHITEBOARD_STOP,
  4: MESSAGES.WHITEBOARD_CLEAR,
  5: MESSAGES.WHITEBOARD_CHANGE,
}

setLogLevel('debug')

let publisher, whiteboard
let subscriber, whiteboardSubscriber
let feedSubscriber

// Base configuration for both publisher and subscriber.
const baseConfig = {
  host: host || window.location.hostname,
  app: app || 'live',
  streamName: streamName || `stream-${new Date().getTime()}`,
  mediaConstraints: {
    audio: false,
    video: {
      width: 1280,
      height: 720,
    },
  },
  enableChannelSignaling: true, // Turn on data channel support.
  trickleIce: true, // Flag to use trickle ice to send candidates.
}
console.log(NAME, 'baseConfig', baseConfig)

/**
 * Returns MediaStream instance of rebroadcast of incoming feed stream.
 * @param {String} feedName
 * @returns
 */
const getFeedStream = async (feedName) => {
  const elementId = 'red5pro-publisher'
  const element = document.querySelector(`#${elementId}`)
  const feedConfig = {
    ...baseConfig,
    mediaElementId: elementId,
    streamName: feedName,
  }
  feedSubscriber = new WHEPClient()
  await feedSubscriber.init(feedConfig)
  await feedSubscriber.subscribe()
  if ('captureStream' in element) {
    return element.captureStream()
  }
  return element.srcObject
}

/**
 * Start the publisher.
 */
const startPublish = async () => {
  // Create a new Publisher instance.
  publisher = new WHIPClient()
  publisher.on('*', (event) => {
    console.log('[Publisher]', event.type)
    if (event.type === 'Publish.Start') {
      handlePublisherResize()
    }
  })

  if (feedName) {
    // If we have a feed name, we will consume that.
    const mediaStream = await getFeedStream(feedName)
    await publisher.initWithStream(baseConfig, mediaStream)
  } else {
    // Else we will broadcast our camera.
    await publisher.init(baseConfig)
  }
  await publisher.publish()
  // Start interactive whiteboard.
  startWhiteboard(publisher)
}

/**
 * Establish the interactive whiteboard.
 * @param {WHIPClient} publisher
 */
const startWhiteboard = (publisher) => {
  const canvasParent = canvas.parentElement
  var ro = new ResizeObserver(() => {
    handlePublisherResize()
  })
  canvasParent && ro.observe(canvasParent)
  const transportName = '[Publisher:DataChannelTransport]'
  const transport =
    transportType === 'klv'
      ? new KLVTransport(transportName, publisher)
      : new DataChannelTransport(transportName, publisher)
  // Create a new Whiteboard instance.
  whiteboard = new Whiteboard('[Publisher:Whiteboard]', canvas, transport)
  // Assign input handlers.
  whiteboard.onStrokeColorChange(strokeColorInput.value)
  whiteboard.onLineWidthChange(parseInt(lineWidthInput.value, 10))
  strokeColorInput.addEventListener('input', (e) => {
    whiteboard.onStrokeColorChange(e.target.value)
  })
  strokeColorInput.addEventListener('change', (e) => {
    whiteboard.onStrokeColorChange(e.target.value)
  })
  lineWidthInput.addEventListener('change', (e) => {
    whiteboard.onLineWidthChange(parseInt(e.target.value, 10))
  })
  clearButton.addEventListener('click', () => {
    whiteboard.clear()
  })
}

/*
 * Start the subscriber.
 */
const startSubscribe = async () => {
  const transportName = '[Subscriber:DataChannelTransport]'
  const transport =
    transportType === 'klv'
      ? new KLVTransport(transportName, {
          receive: (message) => {
            onKLVMessage(message)
          },
        })
      : new DataChannelTransport(transportName, {
          receive: (message) => {
            onDataChannelMessage(message)
          },
        })

  // Create a new Subscriber instance.
  subscriber = new WHEPClient()
  subscriber.on('*', (event) => {
    const { type } = event
    if (type !== 'Subscribe.Time.Update') {
      console.log('[Subscriber]', type)
      if (type === 'Subscribe.Send.Invoke') {
        const {
          data: { senderName },
        } = event.data
        if (senderName && senderName !== baseConfig.streamName) {
          return
        }
        // Forward along to the receiver transport.
        transport.receive(event.data)
      } else if (type === 'WebRTC.DataChannel.Message') {
        const { data, method, type } = event.data
        if (method && type.toLowerCase() === 'metadata') {
          if (method.toLowerCase() === 'onklv') {
            transport.receive(data)
          } else if (method.toLowerCase().match(/^whiteboard/)) {
            transport.receive(data)
          }
        }
      } else if (
        type === 'Subscribe.Start' ||
        type === 'Subscribe.VideoDimensions.Change'
      ) {
        handleSubscriberResize()
      } else if (type === 'Subscribe.Connection.Closed') {
        console.warn(NAME, 'Subscriber connection closed.')
        startSubscribe()
      }
    }
  })
  await subscriber.init({
    ...baseConfig,
    mediaElementId: 'red5pro-subscriber',
  })
  await subscriber.subscribe()

  // Start whiteboard to receive updates from the publisher.
  startSubsciberWhiteboard(subscriber)
}

/**
 * Establish the whiteboard instance that will draw updates from the publisher.
 * @param {WHEPClient} subscriber
 */
const startSubsciberWhiteboard = (subscriber) => {
  const canvasParent = subscriberCanvas.parentElement
  var ro = new ResizeObserver(() => {
    handleSubscriberResize()
  })
  canvasParent && ro.observe(canvasParent)
  // Create a new Whiteboard instance to draw updates on.
  whiteboardSubscriber = new Whiteboard(
    '[Subscriber:Whiteboard]',
    subscriberCanvas,
    undefined,
    false
  )
  whiteboardSubscriber.onStrokeColorChange(strokeColorInput.value)
  whiteboardSubscriber.onLineWidthChange(parseInt(lineWidthInput.value, 10))
}

/**
 * DataChannelTransport receiver message handler.
 * @param {Object} message
 */
const onDataChannelMessage = (message) => {
  const { methodName, data } = message
  if (whiteboardSubscriber) {
    if (methodName === MESSAGES.WHITEBOARD_DRAW) {
      const { x, y, xRatio, yRatio } = data
      whiteboardSubscriber.update(x, y, xRatio, yRatio)
    } else if (methodName === MESSAGES.WHITEBOARD_CLEAR) {
      whiteboardSubscriber.clear()
    } else if (methodName === MESSAGES.WHITEBOARD_START) {
      if (typeof data.coordinates === 'string') {
        data.coordinates = JSON.parse(data.coordinates)
      }
      whiteboardSubscriber.start(data)
    } else if (methodName === MESSAGES.WHITEBOARD_STOP) {
      whiteboardSubscriber.stop()
    } else if (methodName === MESSAGES.WHITEBOARD_CHANGE) {
      const { color, lineWidth } = data
      whiteboardSubscriber.onStrokeColorChange(color)
      whiteboardSubscriber.onLineWidthChange(lineWidth)
    }
  }
}

/**
 * KLVTransport receiver message handler.
 * @param {Object} message
 */
const onKLVMessage = (message) => {
  const { ul } = message // universal label describing the message types.
  const klv = new Map()
  const keys = Object.keys(message)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!isNaN(parseInt(key, 10))) {
      klv.set(key, message[key])
    }
  }

  const hexDecodeToJSON = (hexString) => {
    const rawString = decodeURIComponent(hexString.replace(/(..)/g, '%$1'))
    const decodedString = window.atob(rawString)
    return JSON.parse(decodedString)
  }

  klv.forEach((value, key) => {
    const type = MESSAGE_TYPES[key]
    if (type === MESSAGES.WHITEBOARD_DRAW) {
      try {
        const { x, y, xRatio, yRatio } = hexDecodeToJSON(value)
        whiteboardSubscriber.update(x, y, xRatio, yRatio)
      } catch (e) {
        console.error(e)
      }
    } else if (type === MESSAGES.WHITEBOARD_CLEAR) {
      whiteboardSubscriber.clear()
    } else if (type === MESSAGES.WHITEBOARD_START) {
      try {
        whiteboardSubscriber.start(hexDecodeToJSON(value))
      } catch (e) {
        console.error(e)
      }
    } else if (type === MESSAGES.WHITEBOARD_STOP) {
      whiteboardSubscriber.stop()
    } else if (type === MESSAGES.WHITEBOARD_CHANGE) {
      try {
        const { color, lineWidth } = hexDecodeToJSON(value)
        whiteboardSubscriber.onStrokeColorChange(color)
        whiteboardSubscriber.onLineWidthChange(lineWidth)
      } catch (e) {
        console.error(e)
      }
    }
  })
}

/**
 * Resize event handler for the publisher to provide updated view coordinates to the interactive whiteboard.
 */
const handlePublisherResize = () => {
  if (whiteboard) {
    const { clientWidth, clientHeight } = pubVideo
    const { videoWidth, videoHeight } = pubVideo
    const coordinates = getCoordinates(
      videoWidth,
      videoHeight,
      clientWidth,
      clientHeight,
      pubFit
    )
    whiteboard.onResize(coordinates)
  }
}

/**
 * Resize event handler for the subscriber to provide updated view coordinates to the drawn whiteboard.
 */
const handleSubscriberResize = () => {
  if (whiteboardSubscriber) {
    const { clientWidth, clientHeight } = subVideo
    const { videoWidth, videoHeight } = subVideo
    const coordinates = getCoordinates(
      videoWidth,
      videoHeight,
      clientWidth,
      clientHeight,
      subFit
    )
    whiteboardSubscriber.onResize(coordinates)
  }
}

/**
 * Window resize event handler to update the view coordinates for both publisher and subscriber.
 */
const handleWindowResize = () => {
  handlePublisherResize()
  handleSubscriberResize()
}

/**
 * Shutdown the publisher and subscriber.
 */
const shutdown = () => {
  if (feedSubscriber) {
    feedSubscriber.unsubscribe()
  }
  if (publisher) {
    publisher.unpublish()
  }
  if (subscriber) {
    subscriber.unsubscribe()
  }
}

// Global Event handlers.
window.addEventListener('pagehide', shutdown)
window.addEventListener('beforeunload', shutdown)
window.addEventListener('resize', handleWindowResize)
document.addEventListener('DOMContentLoaded', handleWindowResize)

// Start the publisher and/or subscriber based on defined mode.
const start = async () => {
  if (mode === 'pub') {
    subContainer.style.display = 'none'
    await startPublish()
  } else if (mode === 'sub') {
    pubContainer.style.display = 'none'
    await startSubscribe()
  } else {
    await startPublish()
    // Have to delay because it connects to fast!
    let t = setTimeout(() => {
      clearTimeout(t)
      startSubscribe()
    }, 2000)
  }
}
start()
