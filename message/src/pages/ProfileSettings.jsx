import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUser } from '../store/features/authSlice';
import { Upload, Trash2, ArrowLeft } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { API_BASE_URL, toMediaUrl } from '../config/api';

export const ProfileSettings = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fetch current profile
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/users/profile/me`);
        setProfilePicture(data.profilePicture);
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File is too large. Maximum size is 5MB.' });
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadProfilePicture = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const { data } = await axios.post(
        `${API_BASE_URL}/api/users/profile/picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setProfilePicture(data.profilePicture);
      dispatch(updateUser({ profilePicture: data.profilePicture }));
      setPreviewUrl(null);
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload profile picture' });
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!profilePicture) return;

    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/users/profile/picture`);
      setProfilePicture(null);
      dispatch(updateUser({ profilePicture: undefined }));
      setPreviewUrl(null);
      setMessage({ type: 'success', text: 'Profile picture deleted successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete profile picture' });
      console.error('Delete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d8fff0_0,#f6fbff_42%,#f7f3ff_100%)] p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pt-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white rounded-2xl transition shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-3xl font-black text-slate-900">Profile Settings</h1>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl shadow-slate-300/50 backdrop-blur-xl space-y-6">
          {/* User Info */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl shadow-emerald-100"
                />
              ) : profilePicture ? (
                <img
                  src={toMediaUrl(profilePicture)}
                  alt="Profile"
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl shadow-emerald-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-emerald-50 flex items-center justify-center shadow-xl shadow-emerald-100">
                  <Avatar username={user?.username} size="lg" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-800">{user?.username}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-2xl transition disabled:opacity-50 font-bold shadow-lg shadow-emerald-200"
          >
            <Upload size={18} />
            Choose Profile Picture
          </button>

          {/* Upload Confirm Button (only show if file selected) */}
          {previewUrl && (
            <button
              onClick={handleUploadProfilePicture}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl transition disabled:opacity-50 font-bold shadow-lg shadow-indigo-100"
            >
              {isLoading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          )}

          {/* Delete Button (only show if profile picture exists) */}
          {profilePicture && !previewUrl && (
            <button
              onClick={handleDeleteProfilePicture}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition disabled:opacity-50 font-bold shadow-lg shadow-red-100"
            >
              <Trash2 size={18} />
              Delete Profile Picture
            </button>
          )}

          {/* Cancel Button (only show if file selected) */}
          {previewUrl && (
            <button
              onClick={() => {
                setPreviewUrl(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition font-bold"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Recommended size: 400x400px &bull; Maximum size: 5MB
        </p>
      </div>
    </div>
  );
};
