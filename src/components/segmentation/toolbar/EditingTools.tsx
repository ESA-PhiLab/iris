import React from 'react';
import ToolButton from './ToolButton';

const EditingTools: React.FC = () => {
  return (
    <>
      <ToolButton
        id="tb_undo"
        icon="/segmentation/static/icons/undo.png"
        onClick={() => {
          const w = window as any;
          if (w.undo) w.undo();
        }}
      />
      <ToolButton
        id="tb_redo"
        icon="/segmentation/static/icons/redo.png"
        onClick={() => {
          const w = window as any;
          if (w.redo) w.redo();
        }}
      />
    </>
  );
};

export default EditingTools;
