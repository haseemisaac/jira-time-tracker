'use client';

import { useState, useEffect } from 'react';
import { User, Save, Edit2 } from 'lucide-react';
import { useUserStore } from '../store/userStore';

interface UsernameInputProps {
  onUsernameChange: () => void;
}

export default function UsernameInput({ onUsernameChange }: UsernameInputProps) {
  const { username, setUsername } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState('');

  useEffect(() => {
    setTempUsername(username);
  }, [username]);

  const handleSave = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setIsEditing(false);
      onUsernameChange();
    }
  };

  const handleCancel = () => {
    setTempUsername(username);
    setIsEditing(false);
  };

  if (!username && !isEditing) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <User className="w-6 h-6 text-yellow-700" />
          <p className="text-lg font-semibold text-yellow-900">Username Required</p>
        </div>
        <p className="text-base text-yellow-800 mb-4">
          Please enter your JIRA username to fetch worklogs
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-yellow-600 text-white px-6 py-2.5 rounded-md hover:bg-yellow-700 transition-colors font-medium"
        >
          Set Username
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Edit Username</h3>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
            placeholder="Enter JIRA username"
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            autoFocus
          />
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="bg-gray-300 text-gray-800 px-5 py-2.5 rounded-md hover:bg-gray-400 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">JIRA Username</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{username}</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
          title="Edit username"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}