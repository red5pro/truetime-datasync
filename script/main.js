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
import Whiteboard from './whiteboard.js'
import DataChannelTransport from './datachannel-transport.js'

const { host, app, streamName, get } = query()
const { setLogLevel, WHIPClient, WHEPClient } = red5prosdk

const fit = get('fit') || 'contain'
const mode = get('mode') || 'pubsub'

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

setLogLevel('debug')

let publisher, whiteboard
let subscriber, whiteboardSubscriber

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
  await publisher.init(baseConfig)
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
  // Create a new Whiteboard instance.
  whiteboard = new Whiteboard(
    '[Publisher:Whiteboard]',
    canvas,
    new DataChannelTransport('[Publisher:DataChannelTransport]', publisher)
  )
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
  // Default receiver transport to Send/Invoke messages over the data channel.
  let receiverTransport = new DataChannelTransport(
    '[Subscriber:DataChannelTransport]',
    {
      receive: (message) => {
        onDataChannelMessage(message)
      },
    }
  )

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
        if (senderName !== baseConfig.streamName) {
          return
        }
        // Forward along to the receiver transport.
        receiverTransport.receive(event.data)
      } else if (
        type === 'Subscribe.Start' ||
        type === 'Subscribe.VideoDimensions.Change'
      ) {
        handleSubscriberResize()
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
    if (methodName === 'whiteboardDraw') {
      const { x, y, xRatio, yRatio } = data
      whiteboardSubscriber.update(x, y, xRatio, yRatio)
    } else if (methodName === 'whiteboardClear') {
      whiteboardSubscriber.clear()
    } else if (methodName === 'whiteboardStart') {
      whiteboardSubscriber.start(data)
    } else if (methodName === 'whiteboardStop') {
      whiteboardSubscriber.stop()
    } else if (methodName === 'whiteboardChange') {
      const { color, lineWidth } = data
      whiteboardSubscriber.onStrokeColorChange(color)
      whiteboardSubscriber.onLineWidthChange(lineWidth)
    }
  }
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
    let t = setTimeout(() => {
      clearTimeout(t)
      startSubscribe()
    }, 500)
  }
}
start()
