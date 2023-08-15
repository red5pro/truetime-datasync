const getCoordinates = (
  viewWidth,
  viewHeight,
  clientWidth,
  clientHeight,
  objectFit,
  objectPosition // TODO: remove
) => {
  var coordinates = {}
  var horizontalPercentage = parseInt(objectPosition[0]) / 100
  var verticalPercentage = parseInt(objectPosition[1]) / 100
  var viewRatio = viewWidth / viewHeight
  var clientRatio = clientWidth / clientHeight

  if (objectFit === 'contain') {
    if (viewRatio > clientRatio) {
      coordinates.destinationWidthPercentage = 1
      coordinates.destinationHeightPercentage =
        viewHeight / clientHeight / (viewWidth / clientWidth)
      coordinates.destinationXPercentage = 0
      coordinates.destinationYPercentage =
        (1 - coordinates.destinationHeightPercentage) * verticalPercentage
    } else {
      coordinates.destinationWidthPercentage =
        viewWidth / clientWidth / (viewHeight / clientHeight)
      coordinates.destinationHeightPercentage = 1
      coordinates.destinationXPercentage =
        (1 - coordinates.destinationWidthPercentage) * horizontalPercentage
      coordinates.destinationYPercentage = 0
    }
    coordinates.x =
      clientWidth * (1 - coordinates.destinationWidthPercentage) * 0.5
    coordinates.y =
      clientHeight * (1 - coordinates.destinationHeightPercentage) * 0.5
  } else if (objectFit === 'cover') {
    if (viewRatio > clientRatio) {
      coordinates.sourceWidth = viewHeight * viewRatio
      coordinates.sourceHeight = viewHeight
      coordinates.sourceX = (clientWidth - coordinates.sourceWidth) * 0.5
      coordinates.sourceY = 0
      coordinates.destinationWidthPercentage =
        viewWidth / clientWidth / (viewHeight / clientHeight)
      coordinates.destinationHeightPercentage = 1
    } else {
      coordinates.sourceWidth = viewWidth
      coordinates.sourceHeight = viewWidth / viewRatio
      coordinates.sourceX = 0
      coordinates.sourceY = (clientHeight - coordinates.sourceHeight) * 0.5
      coordinates.destinationWidthPercentage = 1
      coordinates.destinationHeightPercentage =
        viewHeight / clientHeight / (viewWidth / clientWidth)
    }

    coordinates.x =
      (clientWidth - clientWidth * coordinates.destinationWidthPercentage) * 0.5
    coordinates.y =
      (clientHeight - clientHeight * coordinates.destinationHeightPercentage) *
      0.5
  } else {
    coordinates.destinationWidthPercentage = 1
    coordinates.destinationHeightPercentage = 1
    coordinates.x = 0
    coordinates.y = 0
  }

  coordinates.width = clientWidth * coordinates.destinationWidthPercentage
  coordinates.height = clientHeight * coordinates.destinationHeightPercentage
  console.log(
    `COORDS: ${clientWidth},${viewWidth} :: ${coordinates.width},${coordinates.height}`
  )
  return coordinates
}

export { getCoordinates }
