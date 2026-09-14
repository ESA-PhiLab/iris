import React from 'react';

interface UserInfoProps {
  onOpenProfile: () => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ onOpenProfile }) => {
  return (
    <div className="statusbutton" onClick={onOpenProfile} id="user-info">
      <div style={{ float: 'left' }}>Login</div>
    </div>
  );
};

export default UserInfo;
