(() => {
  const notificationArea = document.getElementById('notificationArea')
  const progressArea = document.getElementById('progressArea')
  const downloadButton = document.getElementById('downloadButton')
  downloadButton.onclick = startDownload

  function startDownload () {
    const threadsInput = document.getElementById('threads')
    const chunkSizeInput = document.getElementById('chunkSize')
    const retriesInput = document.getElementById('retries')
    const fileList = document.getElementById('fileList')
    const index = fileList.options.selectedIndex

    if (index > 0) {
      const clusterNum = fileList.options[index].dataset.clusterNum
      const bucketName = fileList.options[index].dataset.bucketName
      const threads = parseInt(threadsInput.value)
      const chunkSize = parseInt(chunkSizeInput.value) * 1024 * 1024
      const retries = parseInt(retriesInput.value)
      const fileName = fileList.options[index].value

      downloadFile({clusterNum, bucketName, threads, chunkSize, retries, fileName})
    }
  }

  function removeAllChildren (element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  function formatSeconds(seconds) {
    if (seconds === 0) return '0 seconds';

    const units = [
      { name: 'year', limit: 31536000, in_seconds: 31536000 },
      { name: 'month', limit: 2592000, in_seconds: 2592000 },
      { name: 'week', limit: 604800, in_seconds: 604800 },
      { name: 'day', limit: 86400, in_seconds: 86400 },
      { name: 'hour', limit: 3600, in_seconds: 3600 },
      { name: 'minute', limit: 60, in_seconds: 60 },
      { name: 'second', limit: 1, in_seconds: 1 },
    ];
    let output = '';
    let unit;
    let unitCount;
    for (let i = 0; i < units.length; i++) {
      unit = units[i];
      unitCount = Math.floor(seconds / unit.in_seconds);
      if (unitCount >= 1) {
        output += ' ' + unitCount + ' ' + unit.name + (unitCount > 1 ? 's' : '');
        seconds -= unitCount * unit.in_seconds;
      }
    }
    return output.trim();
  }

  function downloadFile (options) {
    // Remove any children in the DOM from previous downloads
    removeAllChildren(notificationArea)
    removeAllChildren(progressArea)

    // Change "Download" button text & function to "Cancel"
    downloadButton.innerText = 'Cancel'
    downloadButton.onclick = () => {
      multiThread.cancel()
      // Switch back to download again
      downloadButton.innerText = 'Download'
      downloadButton.onclick = startDownload
    }

    let totalChunks = 0
    let progressElements = []
    const notification = document.createElement('blockquote')

    // These are the main "thread" handlers
    let startTime = 0;
    options.onStart = ({contentLength, chunks}) => {
      notificationArea.appendChild(notification)
      totalChunks = chunks
      startTime = Date.now()
    }

    options.onFinish = () => {
      notification.innerText += '\nFinished successfully!'
      downloadButton.innerText = 'Download'
      downloadButton.onclick = startDownload
    }

    options.onError = ({error}) => {
      console.error(error)
    }

    options.onProgress = ({contentLength, loaded}) => {
      const bytesToMb = bytes => {
        return bytes / 1024 / 1024
      }

      // handle divide-by-zero edge case when Content-Length=0
      const percent = contentLength ? Math.round(loaded / contentLength * 100) : 1

      const elapsed = (Date.now() - startTime) / 1000
      const speed = loaded / elapsed;
      const timeRemaining = (contentLength - loaded) / speed;
      loaded = bytesToMb(loaded).toFixed(1)
      contentLength = bytesToMb(contentLength).toFixed(1)
      notification.innerText = `Downloading ${totalChunks} chunks
                                ${loaded}/${contentLength} MB - ${formatBytes(speed)}/s - ${percent}% - ${formatSeconds(timeRemaining)} remaining`
    }

    // These are the individual chunk handlers
    options.onChunkStart = ({id}) => {
      if (!progressElements[id]) {
        const bg = document.createElement('div')
        bg.classList.add('progress-background')

        const fill = document.createElement('span')
        fill.classList.add('progress-fill')
        fill.style.width = '0%'

        bg.appendChild(fill)
        progressArea.prepend(bg)
        progressElements[id] = {bg, fill}
        progressElements[id].fill.classList.add('downloading')
      } else {
        progressElements[id].fill.classList.remove('downloading')
        progressElements[id].fill.classList.remove('error')
        progressElements[id].fill.classList.add('warning')
      }
    }

    options.onChunkFinish = ({id}) => {
      progressElements[id].fill.classList.remove('error')
      progressElements[id].fill.classList.remove('warning')
      progressElements[id].fill.classList.remove('downloading')
      progressElements[id].fill.classList.add('finished')
    }

    options.onChunkError = ({id, error}) => {
      progressElements[id].fill.classList.remove('downloading')
      progressElements[id].fill.classList.remove('warning')
      progressElements[id].fill.classList.add('error')
      console.warn(`Chunk ${id}:`, error)
    }

    options.onChunkProgress = ({contentLength, loaded, id}) => {
      if (!progressElements[id]) {
        options.onChunkStart({id})
      } else {
        if (progressElements[id].fill.classList.contains('warning')) {
          progressElements[id].fill.classList.remove('warning')
          progressElements[id].fill.classList.add('downloading')
        }

        // handle divide-by-zero edge case when Content-Length=0
        const percent = contentLength ? loaded / contentLength : 1
        progressElements[id].fill.style.width = `${percent * 100}%`
      }
    }

    options.url = `https://s3.us-west-1.wasabisys.com/${options.bucketName}/5/model/${options.fileName}`

    const multiThread = new MultiThread(options)
  }
})()
