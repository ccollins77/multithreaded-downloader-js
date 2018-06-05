(() => {
  const rangeSizeInput = document.getElementById('rangeSize')
  const threadsInput = document.getElementById('threads')
  const retryDelayInput = document.getElementById('retryDelay')
  const retriesInput = document.getElementById('retries')
  const retryOnInput = document.getElementById('retryOn')
  const fileList = document.getElementById('fileList')
  const downloadButton = document.getElementById('downloadButton')
  const cancelButton = document.getElementById('cancelButton')
  const progressArea = document.getElementById('progressArea')

  downloadButton.onclick = () => {
    const index = fileList.options.selectedIndex

    if (index > 0) {
      const clusterNum = fileList.options[index].dataset.clusterNum
      const bucketName = fileList.options[index].dataset.bucketName
      const threads = parseInt(threadsInput.value)
      const rangeSize = parseInt(rangeSizeInput.value)
      const retries = parseInt(retriesInput.value)
      const retryDelay = parseInt(retryDelayInput.value)
      const retryOn = retryOnInput.value.split(',').map(code => parseInt(code))
      const fileName = fileList.options[index].value

      downloadFile({clusterNum, bucketName, threads, rangeSize, retries, retryDelay, retryOn, fileName})
    }
  }

  function downloadFile (options) {
    let progressElements = []
    // Clear out any old progress elements left in the DOM
    while (progressArea.firstChild) {
      progressArea.removeChild(progressArea.firstChild)
    }

    const url = new URL(`https://f${options.clusterNum}.backblazeb2.com/file/${options.bucketName}/${options.fileName}`)
    const multiThread = new MultiThread(options, onProgress, onFinish)
    multiThread.fetch(url, options)

    downloadButton.setAttribute('disabled', true)
    cancelButton.removeAttribute('disabled')

    cancelButton.onclick = () => {
      cancelButton.setAttribute('disabled', true)
      downloadButton.removeAttribute('disabled')
      multiThread.cancel()
    }

    function onFinish () {
      cancelButton.setAttribute('disabled', true)
      downloadButton.removeAttribute('disabled')
    }

    function onProgress ({id, contentLength, loaded}) {
      if (!progressElements[id]) {
        progressElements[id] = document.createElement('progress')
        progressElements[id].value = 0
        progressElements[id].max = 100
        progressArea.appendChild(progressElements[id])
      }

      // handle divide-by-zero edge case when Content-Length=0
      const percent = contentLength ? loaded / contentLength : 1

      progressElements[id].value = Math.round(percent * 100)
    }
  }
})()
