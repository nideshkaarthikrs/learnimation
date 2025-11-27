'use client';

import { useState } from 'react';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateVideo = async () => {
    if (!inputText.trim()) {
      alert('Please enter text to generate a video');
      return;
    }
    
    setIsLoading(true);
    // TODO: Add video generation logic here
    console.log('Generating video for:', inputText);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
          Learnimation
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Transform your text into engaging educational videos
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="textInput" className="block text-sm font-semibold text-gray-700 mb-2">
              Enter your content
            </label>
            <textarea
              id="textInput"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type your educational content here..."
              className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none transition-colors"
            />
          </div>

          <button
            onClick={handleGenerateVideo}
            disabled={isLoading || !inputText.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:translate-y-1 active:scale-95 hover:cursor-pointer disabled:cursor-not-allowed hover:shadow-[0_8px_30px_rgba(99,102,241,0.22)] disabled:hover:shadow-none focus:outline-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              '✨ Generate Video'
            )}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: The more detailed your content, the better the generated video
          </p>
        </div>
      </div>
    </div>
  );
}
