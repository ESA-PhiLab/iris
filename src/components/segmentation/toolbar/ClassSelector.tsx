import React from 'react';

interface ClassSelectorProps {
  onSelectClass: () => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ onSelectClass }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectClass();
  };

  return (
    <li
      className="toolbutton icon_button"
      id="tb_select_class"
      onClick={handleClick}
      style={{ width: '200px' }}
    >
      <div>
        <img
          src="/segmentation/static/icons/class.png"
          className="icon"
          style={{ float: 'left' }}
          alt="Class selector"
        />
      </div>
      <div
        id="tb_current_class"
        style={{
          float: 'left',
          lineHeight: '28px',
          fontSize: '18px',
          fontWeight: 'normal'
        }}
      >
        No class
      </div>
    </li>
  );
};

export default ClassSelector;
