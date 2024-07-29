import React, { useState, useEffect } from 'react';


function App() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFetchInfo = async () => {
    try {
      console.log('Fetching video info for URL:', url);
      const info = await window.electron.fetchVideoInfo(url);
      setVideoInfo(info);
      setMessage('');
    } catch (error) {
      setMessage('Error fetching video info');
      console.error('Error fetching video info:', error);
    }
  };

  const handleDownload = async (type) => {
    try {
      const outputPath = await window.electron.selectFolder();
      if (type === 'video') {
        window.electron.downloadVideo(url, outputPath);
      } else {
        window.electron.downloadAudio(url, outputPath);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  useEffect(() => {
    window.electron.onDownloadComplete((event, filePath) => {
      console.log('Download complete:', filePath);
      setMessage(`Download complete: ${filePath}`);
      setProgress(100);
    });

    window.electron.onDownloadError((event, errorMessage) => {
      console.log('Download error:', errorMessage);
      setMessage(`Download error: ${errorMessage}`);
    });

    window.electron.onDownloadProgress((event, progress) => {
      console.log('Download progress:', progress);
      setProgress(progress);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-center items-center mb-8">
        <input
          type="text"
          placeholder="Ingresa una URL"
          className="border border-gray-300 p-2 rounded-l-md w-64 focus:outline-none"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="bg-black text-white p-2 rounded-r-md"
          onClick={handleFetchInfo}
        >
          Buscar
        </button>
      </div>

      {videoInfo && (
        <div className="text-center">
          <h2 className="font-bold text-lg mb-4">{videoInfo.title}</h2>
          <img src={videoInfo.thumbnail} alt="Thumbnail" className="mb-4 mx-auto" />
          <button
            className="bg-blue-500 text-white p-2 rounded-md mr-2"
            onClick={() => handleDownload('video')}
          >
            Descargar Video
          </button>
          <button
            className="bg-green-500 text-white p-2 rounded-md"
            onClick={() => handleDownload('audio')}
          >
            Descargar Audio
          </button>
          <div className="mt-4">
            <progress className="w-full" value={progress} max="100">{progress}%</progress>
          </div>
        </div>
      )}

      {message && <p className="text-center text-green-500 mt-4">{message}</p>}
    </div>
  );
}

export default App;
