import React, { useState } from 'react';
import { MdVideoCall, MdLink, MdTitle, MdDescription } from 'react-icons/md';
import UniversalDialog from '../UniversalDialog/UniversalDialog';
import './MeetCreationDialog.css';

const MeetCreationDialog = ({ isOpen, onClose, onCreateMeet }) => {
  const [meetData, setMeetData] = useState({
    title: 'Video Meeting',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMeetData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (meetData.title.trim()) {
      onCreateMeet(meetData);
      handleClose();
    }
  };

  const handleClose = () => {
    setMeetData({
      title: 'Video Meeting',
      description: ''
    });
    onClose();
  };

  return (
    <UniversalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Yangi Meet Yaratish"
      size="medium"
      className="meet-creation-dialog"
    >
      <form onSubmit={handleSubmit} className="meet-creation-form">
        <div className="form-group">
          <label className="form-label">
            <MdTitle className="form-icon" />
            Meet nomi
          </label>
          <input
            type="text"
            name="title"
            value={meetData.title}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Meet uchun nom kiriting..."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <MdDescription className="form-icon" />
            Tavsif (ixtiyoriy)
          </label>
          <textarea
            name="description"
            value={meetData.description}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Meet haqida qisqacha ma'lumot..."
            rows={4}
          />
        </div>

        <div className="meet-preview">
          <div className="preview-header">
            <MdVideoCall className="preview-icon" />
            <span>Preview</span>
          </div>
          <div className="preview-content">
            <h4>{meetData.title || 'Meet nomi'}</h4>
            {meetData.description && (
              <p>{meetData.description}</p>
            )}
            <div className="preview-link">
              <MdLink />
              <span>Link avtomatik yaratiladi...</span>
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn--secondary" onClick={handleClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn btn--primary">
            <MdVideoCall />
            Yaratish
          </button>
        </div>
      </form>
    </UniversalDialog>
  );
};

export default MeetCreationDialog;
